import { test, expect } from '@playwright/test';

// Read-only critical paths — safe to run against PRODUCTION (no writes occur).
// Selectors verified against the real staging DOM (2026-06-17).

test.describe('@smoke read-only critical paths', () => {
    test('@public unauthenticated visitor is gated to sign-in', async ({ page }) => {
        await page.goto('/');
        // The app is gated: every logged-out entry point lands on sign-in. This doubles
        // as the production canary — it proves the FE is serving AND the gate holds.
        await expect(page).toHaveURL(/\/sign-in/);
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('a deep link survives the sign-in bounce', async ({ browser }) => {
        // Explicitly empty storage state. browser.newContext() INHERITS this project's
        // `use` options — that is how baseURL reaches page.goto() below — so a bare
        // newContext() would carry the signed-in USER's session and never bounce.
        const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await ctx.newPage();

        await page.goto('/properties?city=Sofia');
        await expect(page).toHaveURL(/\/sign-in\?redirect=/);

        await page.getByLabel(/email/i).fill(process.env.SMOKE_USER_EMAIL!);
        await page.getByLabel(/password/i).fill(process.env.SMOKE_USER_PASSWORD!);
        await page.getByRole('button', { name: /sign in/i }).click();

        // The query string must come back — this is the regression that would
        // otherwise pass silently.
        await expect(page).toHaveURL(/\/properties\?city=Sofia/);
        await ctx.close();
    });

    test('catalog shows priced property cards', async ({ page }) => {
        await page.goto('/');
        // Property cards are links to /properties/<id>; each shows a per-night price like "€65/NT".
        await expect(page.locator('a[href*="/properties/"]').first()).toBeVisible();
        // Pricing renders a real number (not NaN/error).
        await expect(page.getByText(/€\s?\d/).first()).toBeVisible();
    });

    test('open a property detail', async ({ page }) => {
        await page.goto('/');
        await page.locator('a[href*="/properties/"]').first().click();
        await expect(page).toHaveURL(/\/properties\//);
        await expect(page.getByRole('heading').first()).toBeVisible();
    });

    test('admin portal renders user administration (admin session)', async ({ browser }) => {
        // ADMIN is now a pure user-administration role: no dashboard, no properties,
        // no bookings, tickets or pricing. Hitting /admin redirects to /admin/users.
        // This previously asserted an "Occupancy" KPI heading, which an admin can no
        // longer reach at all — see docs/plans/2026-07-28-admin-role-narrowing-design.md.
        const ctx = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
        const page = await ctx.newPage();
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin\/users/);
        await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
        await ctx.close();
    });

    test('manager dashboard renders KPIs (manager session)', async ({ browser }) => {
        // The dashboard moved from ADMIN to MANAGER and is now scoped to the properties
        // the signed-in manager owns. That makes MANAGER the app's entire operational
        // surface — properties, bookings, tickets, pricing — and it currently has NO
        // other smoke coverage.
        //
        // Requires a MANAGER smoke account. Until SMOKE_MANAGER_EMAIL / _PASSWORD are set
        // in CI this skips loudly rather than silently passing.
        const email = process.env.SMOKE_MANAGER_EMAIL;
        const password = process.env.SMOKE_MANAGER_PASSWORD;
        test.skip(!email || !password, 'SMOKE_MANAGER_EMAIL/_PASSWORD not set — manager surface is unmonitored');

        const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await ctx.newPage();
        await page.goto('/sign-in');
        await page.getByLabel(/email/i).fill(email!);
        await page.getByLabel(/password/i).fill(password!);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Generous timeout: unlike the other authed tests this performs a real
        // interactive sign-in against staging (Better Auth round-trip, session
        // cookie, redirect, then the dashboard's own fetch) rather than reusing a
        // stored session. The default 5s expect timeout made this fail on the first
        // attempt and pass on retry — green in CI, but not trustworthy.
        await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });

        // Assert the page LOADED, not that it has data. /api/admin/stats is the newly
        // manager-scoped endpoint; if it 403s or 500s the page renders a "Failed to
        // load dashboard" alert instead. A manager with no properties legitimately
        // shows an empty state, so keying on a KPI heading would fail for a reason
        // that has nothing to do with health.
        await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(/failed to load dashboard/i)).toHaveCount(0);

        // With a portfolio, the occupancy chart must render — that is the scoped
        // aggregate query actually returning usable numbers.
        const hasPortfolio = (await page.getByText(/no properties yet/i).count()) === 0;
        if (hasPortfolio) {
            await expect(page.getByRole('heading', { name: /occupancy/i })).toBeVisible();
        } else {
            test.info().annotations.push({
                type: 'warning',
                description: 'Smoke manager owns no properties — KPI rendering was not exercised.'
            });
        }
        await ctx.close();
    });
});
