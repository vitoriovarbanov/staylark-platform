import { auth } from '../src/config/auth.js';
import { db } from '../src/config/database.js';

// Creates (or repairs) the two synthetic accounts the Playwright @smoke suite signs in as.
// They're login-capable (real Better Auth credential + hashed password) and pre-verified, so
// they can sign in without the email step. Idempotent: re-running just ensures role + verified.
//
// Emails use the `smoke-` prefix so clean-synthetic.mts targets the data they generate.
// Run against STAGING (needs the staging env). Easiest with the Railway CLI:
//   railway run --environment staging --service <backend> -- \
//     pnpm --filter @staylark/backend exec tsx scripts/seed-smoke-e2e.mts
// or pass env explicitly (DATABASE_URL=staging + auth vars + the four SMOKE_* below).

const required = ['SMOKE_USER_EMAIL', 'SMOKE_USER_PASSWORD', 'SMOKE_ADMIN_EMAIL', 'SMOKE_ADMIN_PASSWORD'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
}

async function ensureAccount(email: string, password: string, name: string, role: 'USER' | 'ADMIN') {
    const existing = await db.user.findFirst({ where: { email } });
    if (!existing) {
        // Server-side createUser is trusted by the admin plugin: it creates the credential
        // Account with a hashed password and does NOT fire a "verify your email".
        await auth.api.createUser({
            body: { email, name, password, role: role as unknown as 'admin' }
        });
        console.log(`created ${role} ${email}`);
    } else {
        console.log(`exists ${email} — ensuring role + verified (password unchanged)`);
    }
    const user = await db.user.findFirst({ where: { email } });
    if (!user) throw new Error(`user vanished after create: ${email}`);
    await db.user.update({ where: { id: user.id }, data: { role, emailVerified: true } });
}

await ensureAccount(process.env.SMOKE_USER_EMAIL!, process.env.SMOKE_USER_PASSWORD!, 'Smoke E2E User', 'USER');
await ensureAccount(process.env.SMOKE_ADMIN_EMAIL!, process.env.SMOKE_ADMIN_PASSWORD!, 'Smoke E2E Admin', 'ADMIN');

console.log('smoke e2e accounts ready');
await db.$disconnect();
