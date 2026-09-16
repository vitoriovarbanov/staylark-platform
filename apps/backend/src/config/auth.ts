import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { admin, bearer } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from './database.js';
import { env } from './env.js';
import { sendEmail } from '../services/email/email.service.js';
import { renderEmail, p } from '../services/email/layout.js';
import { toFrontendUrl, withResultCallback } from './auth-urls.js';

export const auth = betterAuth({
    basePath: '/api/auth',
    database: prismaAdapter(db, { provider: 'postgresql' }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        requireEmailVerification: true,
        autoSignIn: true,
        sendResetPassword: async ({ user, url }) => {
            const frontendUrl = toFrontendUrl(url, '/reset-password');
            sendEmail(
                user.email,
                'Reset your password',
                renderEmail({
                    heading: 'Reset your password',
                    bodyHtml: p('Click the button below to choose a new password. This link expires in 1 hour.'),
                    button: { label: 'Reset password', url: frontendUrl }
                })
            );
        }
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            // Keep Better Auth's backend verify endpoint (verifies on a plain GET, then
            // 302-redirects to the backend-rendered result page) so the WHOLE flow works
            // without client-side JS — webmail clients render email in a sandboxed iframe
            // that blocks the SPA bundle from booting.
            const verifyUrl = withResultCallback(url);
            sendEmail(
                user.email,
                'Verify your email',
                renderEmail({
                    heading: 'Verify your email',
                    bodyHtml: p('Confirm your email address to finish setting up your Staylark account.'),
                    button: { label: 'Verify email', url: verifyUrl }
                })
            );
        },
        sendOnSignUp: true,
        // Honor a pending invitation only AFTER the user verifies their email.
        // Granting the invited role on signup (keyed on email alone) would hand an
        // elevated role to anyone who self-registers an invited address before they
        // prove they control the mailbox — an email-squatting privilege-escalation
        // vector. Verification proves mailbox control, so we claim + assign here.
        afterEmailVerification: async user => {
            const now = new Date();
            const invite = await db.invitation.findFirst({
                where: { email: user.email, status: 'PENDING', expiresAt: { gt: now } }
            });
            if (!invite) return;
            await db.$transaction(async tx => {
                const res = await tx.invitation.updateMany({
                    where: { id: invite.id, status: 'PENDING' },
                    data: { status: 'ACCEPTED', acceptedUserId: user.id, acceptedAt: now }
                });
                if (res.count === 1) {
                    await tx.user.update({ where: { id: user.id }, data: { role: invite.role } });
                }
            });
        }
    },
    trustedOrigins: [env.FRONTEND_URL],
    plugins: [
        bearer(),
        admin({
            defaultRole: 'USER',
            adminRoles: ['ADMIN'] // our UserRole enum value, not the plugin default 'admin'
        })
    ],
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: 'USER'
            }
        }
    },
    databaseHooks: {
        session: {
            create: {
                // Better Auth runs its own auth at /api/auth/* and has no knowledge of the
                // app's soft-delete (`deletedAt`). Without this, a soft-deleted account can
                // still sign in and obtain a session (the app's authMiddleware then 401s every
                // data route, but the account is still "logged in" as far as the SPA is
                // concerned). Refuse to issue a session for a soft-deleted user so `deletedAt`
                // stays the single source of truth — no duplicate Better Auth `banned` flag to
                // keep in sync, and `restore` (clearing deletedAt) re-enables sign-in for free.
                before: async session => {
                    const account = await db.user.findUnique({
                        where: { id: session.userId },
                        select: { deletedAt: true }
                    });
                    if (!account || account.deletedAt) {
                        throw new APIError('FORBIDDEN', { message: 'This account has been deactivated.' });
                    }
                }
            }
        }
    }
});
