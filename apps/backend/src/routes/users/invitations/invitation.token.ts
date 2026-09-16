import { randomBytes, createHash } from 'node:crypto';

/** Returns { token } for the email link and { tokenHash } for storage. */
export function generateInviteToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/** Invite lifetime: 7 days from now. */
export function inviteExpiry(now: Date): Date {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}
