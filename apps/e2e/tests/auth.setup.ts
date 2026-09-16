import { test as setup, expect, type Page } from '@playwright/test';

// NOTE: selectors are best-effort. Verify against the real staging DOM with
//   pnpm exec playwright codegen http://localhost:4200/sign-in
// and adjust before relying on these in CI.

const userFile = 'playwright/.auth/user.json';
const adminFile = 'playwright/.auth/admin.json';

async function signIn(page: Page, email: string, password: string) {
    await page.goto('/sign-in');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
}

setup('authenticate as USER', async ({ page }) => {
    await signIn(page, process.env.SMOKE_USER_EMAIL!, process.env.SMOKE_USER_PASSWORD!);
    await expect(page).toHaveURL('/'); // USER lands on home (browse-first UX)
    await page.context().storageState({ path: userFile });
});

setup('authenticate as ADMIN', async ({ page }) => {
    await signIn(page, process.env.SMOKE_ADMIN_EMAIL!, process.env.SMOKE_ADMIN_PASSWORD!);
    await expect(page).toHaveURL(/\/admin/); // MANAGER/ADMIN land on /admin
    await page.context().storageState({ path: adminFile });
});
