import { z } from 'zod';

const envSchema = z
    .object({
        // ─── Core ───────────────────────────────────────────────
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().default(3001),

        // ─── Observability (Sentry) ─────────────────────────────
        // Empty in local dev → Sentry is a no-op (see instrument.ts).
        SENTRY_DSN: z.string().default(''),

        // ─── Observability (background probes) ──────────────────
        PROBE_INTERVAL_MS: z.coerce.number().int().positive().default(120000), // 2 min

        // ─── Database ───────────────────────────────────────────
        DATABASE_URL: z.string().url(),

        // ─── Authentication (Better Auth) ───────────────────────
        BETTER_AUTH_SECRET: z.string().min(32),
        BETTER_AUTH_URL: z.string().url(),
        FRONTEND_URL: z.string().url(),

        // ─── Email (Resend) ─────────────────────────────────────
        RESEND_API_KEY: z.string().default(''),
        RESEND_FROM_EMAIL: z.string().email(),

        // ─── AI (self-hosted inference service — feedback) ──────
        INFERENCE_URL: z.string().url().default('http://localhost:8000'),
        INFERENCE_API_KEY: z.string().default(''),
        USE_INFERENCE_MOCK: z
            .enum(['true', 'false'])
            .default('false')
            .transform(val => val === 'true'),

        // ─── AI (OpenAI — still used by the Tickets feature) ────
        // Kept until TICK is migrated to the inference service; feedback no longer uses it.
        OPENAI_API_KEY: z.string().default(''),
        USE_OPENAI_MOCK: z
            .enum(['true', 'false'])
            .default('false')
            .transform(val => val === 'true'),

        // ─── Storage (Cloudinary) ───────────────────────────────
        CLOUDINARY_CLOUD_NAME: z.string().default(''),
        CLOUDINARY_API_KEY: z.string().default(''),
        CLOUDINARY_API_SECRET: z.string().default(''),
        // Prepended to logical folder names so each environment is isolated within the
        // shared Cloudinary cloud (prod → 'prod/properties/', stg → 'stg/…', dev → 'dev/…').
        // Legacy assets uploaded before prefixing live at the un-prefixed root; their stored
        // absolute URLs keep resolving regardless.
        CLOUDINARY_FOLDER_PREFIX: z
            .string()
            .regex(/^[a-z0-9-]*$/, 'CLOUDINARY_FOLDER_PREFIX must be lowercase alphanumeric or hyphens')
            .default(''),

        // ─── Bookings ───────────────────────────────────────────
        PENDING_EXPIRY_HOURS: z.coerce.number().int().positive().default(48),

        // ─── API Docs ───────────────────────────────────────────
        // When true, mounts Swagger UI at /api/docs. Staging runs NODE_ENV=production,
        // so it must set this explicitly. Real production leaves it unset → docs 404.
        ENABLE_API_DOCS: z
            .enum(['true', 'false'])
            .default('false')
            .transform(val => val === 'true')
    })
    .superRefine((data, ctx) => {
        if (data.NODE_ENV === 'production') {
            const required: Array<{ key: keyof typeof data; label: string }> = [
                { key: 'RESEND_API_KEY', label: 'RESEND_API_KEY' },
                { key: 'RESEND_FROM_EMAIL', label: 'RESEND_FROM_EMAIL' },
                { key: 'INFERENCE_URL', label: 'INFERENCE_URL' },
                { key: 'INFERENCE_API_KEY', label: 'INFERENCE_API_KEY' },
                { key: 'OPENAI_API_KEY', label: 'OPENAI_API_KEY' },
                { key: 'CLOUDINARY_CLOUD_NAME', label: 'CLOUDINARY_CLOUD_NAME' },
                { key: 'CLOUDINARY_API_KEY', label: 'CLOUDINARY_API_KEY' },
                { key: 'CLOUDINARY_API_SECRET', label: 'CLOUDINARY_API_SECRET' }
            ];

            for (const { key, label } of required) {
                if (!data[key]) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `${label} is required in production`,
                        path: [key]
                    });
                }
            }
        }
    });

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
