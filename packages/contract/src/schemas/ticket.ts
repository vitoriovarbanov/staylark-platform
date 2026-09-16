import { z } from 'zod';
import { PaginationSchema, sortSchema } from './list-query.js';

// --- Enums ---
export const TicketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']);

/**
 * Terminal ticket statuses — a ticket in one of these is closed and NOT counted
 * as active. Single source of truth for "open vs done" so backend counts and
 * triage sweeps can't drift. RESOLVED = fixed; DISMISSED = closed without a fix
 * (invalid, duplicate, not-an-issue).
 */
export const TICKET_STATUSES_TERMINAL = ['RESOLVED', 'DISMISSED'] as const satisfies readonly TicketStatus[];
export const TicketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const TicketCategoryEnum = z.enum(['NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY']);

// --- Request schemas ---

/** Body for POST /api/tickets — audio comes via multer (form field). Text is an optional fallback when the user's mic is denied/unavailable. */
export const CreateTicketSchema = z.object({
    propertyId: z.string().uuid(),
    bookingId: z.string().uuid(),
    text: z.string().min(10, 'Report must be at least 10 characters').max(2000).optional()
});

/** Body for PUT /api/tickets/:id/status */
export const UpdateTicketStatusSchema = z.object({
    status: TicketStatusEnum
});

/** Body for POST /api/tickets/:id/messages */
export const CreateTicketMessageSchema = z.object({
    body: z.string().min(1, 'Message cannot be empty').max(2000)
});

/**
 * Languages the AI reply suggestion can be forced into. The values are real
 * language names because they're injected straight into the model prompt AND
 * shown as menu labels — one source of truth for the FE picker + BE validation.
 * Omitting the language (Auto-detect) lets the model match the guest's report.
 */
export const TICKET_REPLY_LANGUAGES = [
    'English',
    'Bulgarian',
    'Russian',
    'German',
    'Spanish',
    'French',
    'Italian',
    'Greek',
    'Romanian'
] as const;

/** Body for POST /api/tickets/:id/suggest-reply — optional explicit reply language. */
export const SuggestReplySchema = z.object({
    language: z.enum(TICKET_REPLY_LANGUAGES).optional()
});

export const TicketParamsSchema = z.object({
    id: z.string().uuid()
});

/** Public sort fields for GET /api/tickets — shared by the FE SortControl + BE field map. */
export const TICKET_SORT_FIELDS = ['priority', 'status', 'assignee', 'createdAt'] as const;

/** Query filters for GET /api/tickets */
export const TicketQuerySchema = z
    .object({
        status: TicketStatusEnum.optional(),
        priority: TicketPriorityEnum.optional(),
        category: TicketCategoryEnum.optional(),
        propertyId: z.string().uuid().optional(),
        // User IDs are Better Auth strings (not UUIDs) — match the rest of the contract.
        assignedToId: z.string().min(1).optional(),
        // Query strings are always strings — z.coerce.boolean() would treat "false" as true
        // (any non-empty string is truthy). Parse the literal tokens instead.
        needsAssignment: z
            .enum(['true', 'false'])
            .transform(v => v === 'true')
            .optional()
    })
    .merge(PaginationSchema)
    .merge(sortSchema(TICKET_SORT_FIELDS));

// --- GPT classification schema (strict enum at the boundary) ---

export const TicketClassificationSchema = z.object({
    category: TicketCategoryEnum,
    priority: TicketPriorityEnum,
    summary: z.string().min(1).max(500)
});

// --- Response schemas ---

export const TicketSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    propertyId: z.string().uuid(),
    // Denormalized so staff can see the property even for tickets on properties
    // they don't manage (e.g. assigned-but-not-managing manager) — the properties
    // list endpoint is manager-scoped and wouldn't include those.
    propertyTitle: z.string(),
    propertyCity: z.string(),
    bookingId: z.string().uuid(),
    assignedToId: z.string().nullable(),
    // Denormalized assignee name (null when unassigned) so the UI can show who a ticket
    // is assigned to without the manager-scoped /users/managers list — which excludes
    // soft-deleted users, leaving a stale assignee otherwise unresolvable.
    assignedToName: z.string().nullable(),
    transcription: z.string().nullable(),
    category: TicketCategoryEnum.nullable(),
    categoryRaw: z.string().nullable(),
    priority: TicketPriorityEnum,
    status: TicketStatusEnum,
    summary: z.string().nullable(),
    needsReview: z.boolean(),
    needsAssignment: z.boolean(),
    // Thread counters — messageCount for staff cards, unreadMessageCount is
    // computed for the reporter (always 0 when serialized for staff in v1).
    messageCount: z.number().int(),
    unreadMessageCount: z.number().int(),
    // Staff-facing "ball is in our court" flag: true when the latest thread
    // message is from the reporter and no staff member has answered it yet.
    // Drives the admin/manager "new guest reply" card indicator. Derived from
    // the messages themselves — no per-staff read state.
    awaitingStaffReply: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export const TicketListResponseSchema = z.object({
    tickets: z.array(TicketSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int()
});

// --- Ticket thread (messages) ---

export const TicketMessageSchema = z.object({
    id: z.string().uuid(),
    ticketId: z.string().uuid(),
    // User IDs are Better Auth strings (not UUIDs) — match the rest of the contract.
    authorId: z.string(),
    // Denormalized author fields (same convention as assignedToName) — the UI
    // styles staff vs. reporter bubbles by role without an extra users fetch.
    authorName: z.string(),
    authorRole: z.enum(['USER', 'MANAGER', 'ADMIN']),
    body: z.string(),
    createdAt: z.string().datetime()
});

// --- Real-time events (Socket.IO) ---

/** Single event channel for ticket pushes to the reporter. */
export const TICKET_EVENT = 'ticket:event';

export const TicketEventSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('status_changed'),
        ticketId: z.string().uuid(),
        status: TicketStatusEnum
    }),
    z.object({
        type: z.literal('new_message'),
        ticketId: z.string().uuid(),
        message: TicketMessageSchema
    })
]);

// --- Ticket routing / assignment schemas ---

/** Body for PUT /api/admin/ticket-routing/:category — replaces the whole set. */
export const UpdateCategoryAssigneesSchema = z.object({
    // User IDs are Better Auth strings (not UUIDs) — match the rest of the contract.
    userIds: z.array(z.string().min(1))
});

export const CategoryParamsSchema = z.object({
    category: TicketCategoryEnum
});

/** Body for PUT /api/tickets/:id/assignee — null clears assignment (back to triage). */
export const ReassignTicketSchema = z.object({
    // User IDs are Better Auth strings (not UUIDs) — match the rest of the contract.
    assignedToId: z.string().min(1).nullable()
});

/** One category's full mapping, returned by GET /api/admin/ticket-routing. */
export const CategoryRoutingSchema = z.object({
    category: TicketCategoryEnum,
    assignees: z.array(
        z.object({
            userId: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.enum(['MANAGER', 'ADMIN'])
        })
    )
});

export const CategoryRoutingListSchema = z.array(CategoryRoutingSchema);

// --- Types ---
export type Ticket = z.infer<typeof TicketSchema>;
export type CreateTicket = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketStatus = z.infer<typeof UpdateTicketStatusSchema>;
export type TicketQuery = z.infer<typeof TicketQuerySchema>;
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];
export type TicketParams = z.infer<typeof TicketParamsSchema>;
export type TicketClassification = z.infer<typeof TicketClassificationSchema>;
export type TicketListResponse = z.infer<typeof TicketListResponseSchema>;
export type TicketCategory = z.infer<typeof TicketCategoryEnum>;
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export type TicketPriority = z.infer<typeof TicketPriorityEnum>;
export type UpdateCategoryAssignees = z.infer<typeof UpdateCategoryAssigneesSchema>;
export type ReassignTicket = z.infer<typeof ReassignTicketSchema>;
export type CategoryRouting = z.infer<typeof CategoryRoutingSchema>;
export type CategoryRoutingList = z.infer<typeof CategoryRoutingListSchema>;
export type TicketMessage = z.infer<typeof TicketMessageSchema>;
export type CreateTicketMessage = z.infer<typeof CreateTicketMessageSchema>;
export type TicketEvent = z.infer<typeof TicketEventSchema>;
export type SuggestReply = z.infer<typeof SuggestReplySchema>;
export type TicketReplyLanguage = (typeof TICKET_REPLY_LANGUAGES)[number];

// --- "Critical tickets" classification (shared by admin dashboard FE + BE) ---

/** Priorities surfaced on the admin "Critical tickets" table. */
export const CRITICAL_TICKET_PRIORITIES = ['CRITICAL', 'HIGH'] as const satisfies readonly TicketPriority[];

/**
 * A ticket demands immediate attention (red highlight) when it is top-priority
 * or an emergency. Single source of truth so the backend query and the frontend
 * highlight can't drift apart.
 */
export const isUrgentTicket = (t: { priority: TicketPriority; category: TicketCategory | null }): boolean =>
    t.priority === 'CRITICAL' || t.category === 'EMERGENCY';
