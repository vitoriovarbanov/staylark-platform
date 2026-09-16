import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'prisma/**/*.test.ts'],
        // Health/probe unit tests must not need a real DB or network.
        // Integration tests that touch Prisma are out of scope here.
        globals: false,
        // Dummy values so `config/env.ts` (parsed at import time, transitively pulled in
        // via logger/db) validates without a real environment. Tests are hermetic: nothing
        // here actually connects — checkPostgres against this dummy URL simply returns `fail`.
        env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-0123',
            BETTER_AUTH_URL: 'http://localhost:3001',
            FRONTEND_URL: 'http://localhost:4200',
            RESEND_FROM_EMAIL: 'test@example.com'
        }
    }
});
