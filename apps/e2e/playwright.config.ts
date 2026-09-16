import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    timeout: 30_000,
    reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:4200',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        { name: 'setup', testMatch: /auth\.setup\.ts/ },
        // Unauthenticated read-only checks — no login, no setup dependency. Safe to run against
        // PRODUCTION (creates no accounts/sessions). The prod job runs only this project.
        {
            name: 'public',
            testMatch: /smoke-readonly\.spec\.ts/,
            grep: /@public/,
            use: { ...devices['Desktop Chrome'] }
        },
        // Authenticated journeys (admin dashboard, write-path) — STAGING only. Requires login.
        {
            name: 'authed',
            testIgnore: /auth\.setup\.ts/,
            grepInvert: /@public/,
            use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
            dependencies: ['setup']
        }
    ]
});
