// User Invitation Flow smoke probe — invitations service layer.
//
// Exercises invitationsService end-to-end against the dev DB: create (no User
// yet) → lookup → accept (User+Account created, role forced, verified, session
// minted) → resend (new token) → revoke / expiry (uniform 404) → double-accept
// (claim guard) → the privilege-escalation guard (no role before verification)
// → invite of an existing email (409).
//
// Token technique: the service's `create`/`resend` generate the token
// internally and never return it. For paths that need the raw plaintext token
// (lookup/accept/resend-hash/expiry/double-accept) we insert the invitation
// DIRECTLY via `invitationsRepository.upsertPending` with a token we minted via
// `generateInviteToken()`, so the test holds the plaintext value.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-invitations.mts

import { randomBytes } from 'node:crypto';
import { invitationsService } from '../src/routes/users/invitations/invitations.service.js';
import { invitationsRepository } from '../src/routes/users/invitations/invitations.repository.js';
import { generateInviteToken, inviteExpiry } from '../src/routes/users/invitations/invitation.token.js';
import { auth } from '../src/config/auth.js';
import { db } from '../src/config/database.js';

const TAG = 'invite-smoke-';

// A function declaration (not a const arrow) so TypeScript treats it as a
// control-flow terminator and narrows after `if (!x) fail(...)` guards.
function fail(msg: string): never {
    throw new Error(`SMOKE FAIL: ${msg}`);
}

/** Asserts an async call throws with the expected HTTP status code. */
async function expectStatus(fn: () => Promise<unknown>, status: number, label: string): Promise<void> {
    try {
        await fn();
    } catch (err) {
        const got = (err as { statusCode?: number }).statusCode;
        if (got === status) return;
        fail(`${label} — expected status ${status}, got ${got} (${(err as Error).message})`);
    }
    fail(`${label} — expected throw, none happened`);
}

const email = (suffix: string) => `${TAG}${suffix}@test.local`;
/** A valid strong password (>= 8 chars, mixed case + digit + symbol). */
const randomPassword = () => `${randomBytes(9).toString('base64url')}Aa1!`;

const cleanup = async () => {
    await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
    await db.invitation.deleteMany({ where: { email: { startsWith: TAG } } });
};

console.log('Invitation flow smoke — invitations service\n');
await cleanup();

try {
    // ── Seed the admin actor (the inviter for create/resend/revoke) ──────────
    const admin = await db.user.create({
        data: { name: 'Smoke Admin', email: email('admin'), emailVerified: true, role: 'ADMIN' }
    });
    const actor = { id: admin.id, name: 'Smoke Admin', role: 'ADMIN' };

    // 1 ── create: service mints the token internally; a PENDING invitation row
    //      exists, and NO User row is created (User is only born on accept).
    {
        const created = await invitationsService.create(actor, { email: email('inv'), name: 'Inv Mgr', role: 'MANAGER' });
        if (created.status !== 'PENDING') fail(`create status not PENDING: ${created.status}`);
        const row = await db.invitation.findFirst({ where: { email: email('inv') } });
        if (!row) fail('create: invitation row missing');
        const user = await db.user.findUnique({ where: { email: email('inv') } });
        if (user) fail('create: a User row exists, but should not until accept');
        // The invite email is fire-and-forget (sendInviteEmail) — not asserted here.
        console.log('  ✓ 1. create → PENDING invitation, no User yet');
    }

    // 2 ── lookup: insert via repo so we hold the raw token; returns public data.
    {
        const { token, tokenHash } = generateInviteToken();
        await invitationsRepository.upsertPending({
            email: email('lookup'),
            name: 'Look Up',
            role: 'MANAGER',
            tokenHash,
            expiresAt: inviteExpiry(new Date()),
            invitedById: admin.id
        });
        const pub = await invitationsService.lookup(token);
        if (pub.email !== email('lookup')) fail(`lookup email mismatch: ${pub.email}`);
        if (pub.role !== 'MANAGER') fail(`lookup role mismatch: ${pub.role}`);
        if (pub.inviterName !== 'Smoke Admin') fail(`lookup inviterName mismatch: ${pub.inviterName}`);
        console.log('  ✓ 2. lookup → { email, role, inviterName }');
    }

    // 3 ── accept: insert via repo (distinct email) so we hold the raw token.
    //      Creates the User+Account, forces role + verification, claims the
    //      invite, and returns the auth Response carrying the session cookie.
    // 4 ── role can't be escalated: the accept payload has NO role field, so the
    //      created user's role can only come from the invitation (MANAGER) — the
    //      `res.role === 'MANAGER'` assertion below also covers assertion #4.
    {
        const { token, tokenHash } = generateInviteToken();
        const inv = await invitationsRepository.upsertPending({
            email: email('accept'),
            name: 'Accept Me',
            role: 'MANAGER',
            tokenHash,
            expiresAt: inviteExpiry(new Date()),
            invitedById: admin.id
        });
        const res = await invitationsService.accept(token, { password: randomPassword() });
        if (!(res instanceof Response)) fail('accept did not return a Response');
        if (res.headers.getSetCookie().length === 0) fail('accept: no Set-Cookie / session header');

        const user = await db.user.findUnique({ where: { email: email('accept') } });
        if (!user) fail('accept: User row not created');
        if (user.emailVerified !== true) fail('accept: user not emailVerified');
        if (user.role !== 'MANAGER') fail(`accept: role not MANAGER (escalation guard): ${user.role}`);

        const claimed = await invitationsRepository.findById(inv.id);
        if (!claimed) fail('accept: invitation vanished');
        if (claimed.status !== 'ACCEPTED') fail(`accept: invitation not ACCEPTED: ${claimed.status}`);
        if (claimed.acceptedUserId !== user.id) fail('accept: acceptedUserId mismatch');
        console.log('  ✓ 3. accept → User created, verified, session cookie set, invite ACCEPTED');
        console.log('  ✓ 4. role not escalatable (created role == invitation role only)');
    }

    // 5 ── resend: create via service, fetch id, resend — the tokenHash rotates.
    {
        await invitationsService.create(actor, { email: email('resend'), name: 'Re Send', role: 'MANAGER' });
        const before = await db.invitation.findFirst({ where: { email: email('resend') } });
        if (!before) fail('resend: invitation not created');
        await invitationsService.resend(actor, before.id);
        const after = await invitationsRepository.findById(before.id);
        if (!after) fail('resend: invitation vanished');
        if (after.tokenHash === before.tokenHash) fail('resend: tokenHash did not change (no new token)');
        console.log('  ✓ 5. resend → new tokenHash issued');
    }

    // 6 ── revoke: insert via repo, revoke, then the raw token fails lookup (404).
    {
        const { token, tokenHash } = generateInviteToken();
        const inv = await invitationsRepository.upsertPending({
            email: email('revoke'),
            name: 'Re Voke',
            role: 'MANAGER',
            tokenHash,
            expiresAt: inviteExpiry(new Date()),
            invitedById: admin.id
        });
        await invitationsService.revoke(actor, inv.id);
        await expectStatus(() => invitationsService.lookup(token), 404, '6. revoked lookup');
        console.log('  ✓ 6. revoke → lookup 404');
    }

    // 7 ── expiry: insert via repo, back-date expiresAt, then lookup fails (404).
    {
        const { token, tokenHash } = generateInviteToken();
        const inv = await invitationsRepository.upsertPending({
            email: email('expiry'),
            name: 'Ex Piry',
            role: 'MANAGER',
            tokenHash,
            expiresAt: inviteExpiry(new Date()),
            invitedById: admin.id
        });
        await db.invitation.update({ where: { id: inv.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
        await expectStatus(() => invitationsService.lookup(token), 404, '7. expired lookup');
        console.log('  ✓ 7. expiry → lookup 404');
    }

    // 8 ── double-accept: insert via repo, accept once (claims the invite), then a
    //      second accept must fail. The service may throw ConflictError(409) (the
    //      account now exists) or NotFoundError(404) (the invite is no longer
    //      PENDING) depending on ordering — either is a pass.
    {
        const { token, tokenHash } = generateInviteToken();
        await invitationsRepository.upsertPending({
            email: email('double'),
            name: 'Dou Ble',
            role: 'MANAGER',
            tokenHash,
            expiresAt: inviteExpiry(new Date()),
            invitedById: admin.id
        });
        await invitationsService.accept(token, { password: randomPassword() });
        try {
            await invitationsService.accept(token, { password: randomPassword() });
            fail('8. double accept — expected throw, none happened');
        } catch (err) {
            const got = (err as { statusCode?: number }).statusCode;
            if (got !== 409 && got !== 404) {
                fail(`8. double accept — expected 409 or 404, got ${got} (${(err as Error).message})`);
            }
        }
        console.log('  ✓ 8. double-accept → 409 or 404');
    }

    // 9 ── security: NO role before verification. Create a pending invite, then
    //      self-signup that email. Because the honor-the-invite grant fires in
    //      `afterEmailVerification` (NOT on signup) and `requireEmailVerification`
    //      is on, the freshly self-signed-up user must still be a plain USER with
    //      emailVerified=false, and the invite must remain PENDING. This guards
    //      the email-squatting privilege-escalation vector.
    //
    //      NOTE: the full honor-AFTER-verification path (self-signup → verify
    //      email → role granted) needs a real email-verification token round-trip,
    //      which is awkward in a service probe; it is covered by manual E2E
    //      (Task 14). This assertion proves the security-critical half.
    {
        await invitationsService.create(actor, { email: email('selfsignup'), name: 'Self Signup', role: 'MANAGER' });
        await auth.api.signUpEmail({
            body: { email: email('selfsignup'), password: randomPassword(), name: 'Self Signup' }
        });
        const user = await db.user.findUnique({ where: { email: email('selfsignup') } });
        if (!user) fail('9. self-signup: User row not created');
        if (user.role !== 'USER') fail(`9. self-signup granted role before verification: ${user.role}`);
        if (user.emailVerified !== false) fail('9. self-signup: user already emailVerified (expected false)');
        const invite = await db.invitation.findFirst({ where: { email: email('selfsignup') } });
        if (!invite) fail('9. self-signup: invitation vanished');
        if (invite.status !== 'PENDING') fail(`9. self-signup: invite no longer PENDING: ${invite.status}`);
        console.log('  ✓ 9. security — no role/verification granted before email verification');
    }

    // 10 ── invite an email that already has a User → ConflictError (409).
    {
        await db.user.create({
            data: { name: 'Already Exists', email: email('existing'), emailVerified: true, role: 'USER' }
        });
        await expectStatus(
            () => invitationsService.create(actor, { email: email('existing'), name: 'E', role: 'MANAGER' }),
            409,
            '10. invite existing'
        );
        console.log('  ✓ 10. invite existing email → 409');
    }

    console.log('\n✓ All invitation smoke assertions passed');
} finally {
    await cleanup();
    await db.$disconnect();
}
