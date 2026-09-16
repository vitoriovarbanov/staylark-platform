/**
 * Smoke test: Socket.IO handshake auth.
 * Usage: BASE=http://localhost:3001 EMAIL=<account> PASSWORD=<password> \
 *        pnpm tsx scripts/smoke-realtime.mts
 * Requires the dev server running (pnpm dev) against the local DB.
 */
import { io } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const EMAIL = process.env.EMAIL ?? 'testuser7@staylark.com';
const PASSWORD = process.env.PASSWORD;
if (!PASSWORD) {
    console.error('PASSWORD is required — this script signs in as a real account.');
    process.exit(1);
}

// 1. Sign in (Origin header required by Better Auth trustedOrigins)
const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:4200' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
});
if (!res.ok) throw new Error(`sign-in failed: ${res.status} ${await res.text()}`);
const token = res.headers.get('set-auth-token');
if (!token) throw new Error('no set-auth-token header — is the bearer plugin enabled?');
console.log('✓ signed in, got bearer token');

// 2. Valid token → connect succeeds
await new Promise<void>((resolve, reject) => {
    const socket = io(BASE, { auth: { token } });
    socket.on('connect', () => {
        console.log('✓ socket connected with valid token');
        socket.disconnect();
        resolve();
    });
    socket.on('connect_error', err => reject(new Error(`unexpected connect_error: ${err.message}`)));
    setTimeout(() => reject(new Error('connect timed out')), 5000);
});

// 3. Garbage token → rejected
await new Promise<void>((resolve, reject) => {
    const socket = io(BASE, { auth: { token: 'garbage' }, reconnection: false });
    socket.on('connect', () => reject(new Error('connected with a garbage token — auth middleware broken')));
    socket.on('connect_error', () => {
        console.log('✓ socket rejected with invalid token');
        resolve();
    });
    setTimeout(() => reject(new Error('rejection timed out')), 5000);
});

console.log('PASS smoke-realtime');
process.exit(0);
