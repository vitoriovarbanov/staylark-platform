import { z } from 'zod';
import { PaginationSchema, sortSchema } from './list-query.js';

// --- Enums ---

export const UserRoleEnum = z.enum(['USER', 'MANAGER', 'ADMIN']);
export const SubscriptionTierEnum = z.enum(['BASIC', 'PREMIUM', 'EXECUTIVE']);

// --- Schemas ---

/** User response schema — never exposes password or internal auth fields */
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().min(1),
    role: UserRoleEnum,
    subscriptionTier: SubscriptionTierEnum.nullable(),
    phone: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

/** Dev: min 8 chars only */
const SimplePasswordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

/** Production: 8+ chars, uppercase, lowercase, digit, special character */
const StrongPasswordSchema = SimplePasswordSchema.regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a digit')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character (!@#$%^&*...)');

/** Use strict=false for local dev, strict=true (default) for staging/production */
export function passwordSchema(strict = true) {
    return strict ? StrongPasswordSchema : SimplePasswordSchema;
}

export const SignUpSchema = z.object({
    email: z.string().email(),
    password: SimplePasswordSchema,
    name: z.string().min(1).max(100)
});

export const StrictSignUpSchema = z.object({
    email: z.string().email(),
    password: StrongPasswordSchema,
    name: z.string().min(1).max(100)
});

export const SignInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

export const ResetPasswordSchema = z.object({
    email: z.string().email()
});

export const NewPasswordSchema = z
    .object({
        password: SimplePasswordSchema,
        confirmPassword: z.string().min(1)
    })
    .refine(data => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword']
    });

export const StrictNewPasswordSchema = z
    .object({
        password: StrongPasswordSchema,
        confirmPassword: z.string().min(1)
    })
    .refine(data => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword']
    });

/** Minimal user shape for assignment dropdowns — no PII beyond name/email. */
export const ManagerSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: UserRoleEnum
});

// --- Admin user management (ADMIN-004) ---

/** Admin list row — UserSchema plus the soft-delete marker for the Active/Deleted status column. */
export const AdminUserSchema = UserSchema.extend({
    deletedAt: z.string().datetime().nullable()
});

/** Public sort fields for GET /api/users — shared by the FE SortControl + BE field map. */
export const USER_SORT_FIELDS = ['createdAt', 'name', 'role'] as const;

export const UserListQuerySchema = z
    .object({
        role: UserRoleEnum.optional(),
        search: z.string().optional(), // matches name OR email (case-insensitive)
        // Query params arrive as strings; z.coerce.boolean() would turn "false" into true
        // (any non-empty string is truthy). Parse the literal flag explicitly instead.
        includeDeleted: z
            .enum(['true', 'false'])
            .default('false')
            .transform(value => value === 'true')
    })
    .merge(PaginationSchema)
    .merge(sortSchema(USER_SORT_FIELDS));

export const AdminUpdateUserSchema = z
    .object({
        name: z.string().min(1).max(100).optional(),
        role: UserRoleEnum.optional(),
        /**
         * Required when this update demotes a staff user to USER: the manager who
         * inherits their properties and open tickets. Without it those properties
         * would be orphaned — invisible to every manager and unreachable by admins,
         * who hold no property access.
         */
        successorManagerId: z.string().min(1).optional()
    })
    .refine(data => data.name !== undefined || data.role !== undefined, {
        message: 'At least one of name or role must be provided'
    });

/** Body for soft-deleting a staff user; the successor inherits their portfolio. */
export const AdminDeleteUserSchema = z.object({
    successorManagerId: z.string().min(1).optional()
});

export const UserListResponseSchema = z.object({
    data: z.array(AdminUserSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive()
});

// --- Types ---

export type User = z.infer<typeof UserSchema>;
export type ManagerSummary = z.infer<typeof ManagerSummarySchema>;
export type AdminUser = z.infer<typeof AdminUserSchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];
export type AdminUpdateUser = z.infer<typeof AdminUpdateUserSchema>;
export type AdminDeleteUser = z.infer<typeof AdminDeleteUserSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
export type SignUp = z.infer<typeof SignUpSchema>;
export type SignIn = z.infer<typeof SignInSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type NewPassword = z.infer<typeof NewPasswordSchema>;
export type UserRole = z.infer<typeof UserRoleEnum>;
export type SubscriptionTier = z.infer<typeof SubscriptionTierEnum>;
