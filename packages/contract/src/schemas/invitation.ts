import { z } from 'zod';
import { UserRoleEnum } from './auth.js';

export const InvitationStatusEnum = z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']);

/** Admin-facing invitation row (status may be the derived 'EXPIRED'). */
export const InvitationSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleEnum,
    status: InvitationStatusEnum,
    expiresAt: z.string().datetime(),
    inviterName: z.string().nullable(),
    acceptedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime()
});

export const CreateInvitationSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    role: UserRoleEnum
});

export const InvitationListResponseSchema = z.object({
    data: z.array(InvitationSchema)
});

/** Public accept-page lookup payload — no ids/tokens leaked. */
export const InvitationPublicSchema = z.object({
    email: z.string().email(),
    name: z.string(),
    role: UserRoleEnum,
    inviterName: z.string().nullable()
});

export const AcceptInvitationSchema = z.object({
    password: z.string().min(8),
    name: z.string().min(1).max(100).optional()
});

export type Invitation = z.infer<typeof InvitationSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusEnum>;
export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;
export type InvitationListResponse = z.infer<typeof InvitationListResponseSchema>;
export type InvitationPublic = z.infer<typeof InvitationPublicSchema>;
export type AcceptInvitation = z.infer<typeof AcceptInvitationSchema>;
