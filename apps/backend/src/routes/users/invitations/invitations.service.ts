import type { AcceptInvitation, CreateInvitation, Invitation, InvitationPublic } from '@staylark/contract';
import { db } from '../../../config/database.js';
import { auth } from '../../../config/auth.js';
import { logger } from '../../../utils/logger.js';
import { ConflictError, NotFoundError, AppError } from '../../../utils/errors.js';
import { usersRepository } from '../repository/users.repository.js';
import { invitationsRepository } from './invitations.repository.js';
import { generateInviteToken, hashInviteToken, inviteExpiry } from './invitation.token.js';
import { sendInviteEmail } from '../../../services/email/email.service.js';

type Actor = { id: string; name: string; role: string };

export const invitationsService = {
    create: async (actor: Actor, data: CreateInvitation): Promise<Invitation> => {
        // Reject if an account already exists for this email (active or soft-deleted).
        const existingUser = await usersRepository.findByEmailAny(data.email);
        if (existingUser) {
            throw new ConflictError(
                existingUser.deletedAt
                    ? 'A deleted user with this email exists — restore them instead'
                    : 'A user with this email already exists'
            );
        }

        const now = new Date();
        const { token, tokenHash } = generateInviteToken();
        const invitation = await invitationsRepository.upsertPending({
            email: data.email,
            name: data.name,
            role: data.role,
            tokenHash,
            expiresAt: inviteExpiry(now),
            invitedById: actor.id
        });

        sendInviteEmail({ to: data.email, inviterName: actor.name, role: data.role, token });
        logger.info({ actorId: actor.id, email: data.email, role: data.role }, 'invitations.create');
        return invitation;
    },

    list: async (): Promise<Invitation[]> => invitationsRepository.listAll(new Date()),

    resend: async (actor: Actor, id: string): Promise<Invitation> => {
        const row = await invitationsRepository.findById(id);
        if (!row || row.status !== 'PENDING') throw new NotFoundError('Pending invitation not found');

        const now = new Date();
        const { token, tokenHash } = generateInviteToken();
        const invitation = await invitationsRepository.setToken(id, tokenHash, inviteExpiry(now));
        sendInviteEmail({ to: row.email, inviterName: actor.name, role: row.role, token });
        logger.info({ actorId: actor.id, id }, 'invitations.resend');
        return invitation;
    },

    revoke: async (actor: Actor, id: string): Promise<void> => {
        const row = await invitationsRepository.findById(id);
        if (!row || row.status !== 'PENDING') throw new NotFoundError('Pending invitation not found');
        await invitationsRepository.revoke(id);
        logger.info({ actorId: actor.id, id }, 'invitations.revoke');
    },

    /** Public: validate token, return render data (uniform error on any bad state). */
    lookup: async (token: string): Promise<InvitationPublic> => {
        const row = await invitationsRepository.findByTokenHash(hashInviteToken(token));
        if (!row || row.status !== 'PENDING' || row.expiresAt < new Date()) {
            throw new NotFoundError('This invitation is invalid or has expired');
        }
        return {
            email: row.email,
            name: row.name,
            role: row.role,
            inviterName: row.invitedBy?.name ?? null
        };
    },

    /**
     * Public accept: create the User+Account (role forced from the invite, marked
     * verified), claim the invitation atomically, and return the auth Response so
     * the controller can forward Set-Cookie.
     *
     * Spike-confirmed recipe (Task 0): `signUpEmail` does NOT return a session while
     * `requireEmailVerification: true` (token null, no Set-Cookie). So we (1) sign up
     * to create the User+Account, (2) re-fetch the user, (3) force role + emailVerified
     * and claim the invite in one transaction, then (4) mint the session with a
     * separate `signInEmail({ asResponse: true })` whose Set-Cookie the controller forwards.
     */
    accept: async (token: string, data: AcceptInvitation): Promise<Response> => {
        const tokenHash = hashInviteToken(token);
        const row = await invitationsRepository.findByTokenHash(tokenHash);
        if (!row || row.status !== 'PENDING' || row.expiresAt < new Date()) {
            throw new NotFoundError('This invitation is invalid or has expired');
        }
        // Guard against an account created since the invite (e.g. self-signup).
        if (await usersRepository.findByEmailAny(row.email)) {
            throw new ConflictError('An account with this email already exists — try signing in');
        }

        // 1. Create the credential account (Better Auth machinery). No session yet.
        // Server-side createUser is treated as trusted by the admin plugin and does NOT
        // fire sendOnSignUp, so the invitee gets no redundant "verify your email".
        await auth.api.createUser({
            body: {
                email: row.email,
                name: data.name ?? row.name,
                password: data.password,
                role: row.role as unknown as 'admin' // plugin types role to its AC roles; our enum is stored verbatim
            }
        });

        // 2. Re-fetch the freshly created user.
        const user = await usersRepository.findByEmailAny(row.email);
        if (!user) throw new AppError('User vanished after accept', 500);

        // 3. Force role + verification and claim the invite atomically.
        const now = new Date();
        const claimed = await db.$transaction(async tx => {
            await tx.user.update({
                where: { id: user.id },
                data: { role: row.role, emailVerified: true }
            });
            return invitationsRepository.claim(tx, row.id, user.id, now);
        });
        // accept fully owns account creation now (createUser fires no hooks), so a
        // failed claim means the invite was concurrently consumed/revoked.
        if (!claimed) throw new ConflictError('This invitation was already used');

        logger.info({ invitationId: row.id, userId: user.id, role: row.role }, 'invitations.accept');

        // 4. Mint a session (asResponse so the controller forwards Set-Cookie).
        return auth.api.signInEmail({
            body: { email: row.email, password: data.password },
            asResponse: true
        });
    }
};
