import { z } from 'zod';
import { TicketPriorityEnum, TicketCategoryEnum } from './ticket.js';

// --- Query ---

// propertyId is a Property id (uuid). startDate/endDate bound the resolution-speed
// window only (YYYY-MM-DD). Live status/breakdown counts ignore the date range.
export const TicketStatsQuerySchema = z.object({
    startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
        .optional(),
    endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
        .optional(),
    propertyId: z.string().uuid().optional()
});

// --- Response ---

export const AssigneeStatsSchema = z.object({
    assigneeId: z.string(), // Better Auth id — string, not uuid
    assigneeName: z.string(),
    openCount: z.number().int(), // live
    inProgressCount: z.number().int(), // live
    resolvedCount: z.number().int(), // within date range
    avgResolutionHours: z.number().nullable() // null if none resolved in range
});

export const PriorityBreakdownSchema = z.object({
    priority: TicketPriorityEnum,
    count: z.number().int()
});

export const CategoryBreakdownSchema = z.object({
    category: TicketCategoryEnum,
    count: z.number().int()
});

export const TicketStatsSchema = z.object({
    // KPI cards — live status counts (ignore date range)
    statusCounts: z.object({
        open: z.number().int(),
        inProgress: z.number().int(),
        resolved: z.number().int(),
        dismissed: z.number().int()
    }),
    urgentOpenCount: z.number().int(), // active + (CRITICAL/HIGH or EMERGENCY)
    // resolution speed — within date range
    resolvedInRange: z.number().int(),
    avgResolutionHours: z.number().nullable(),
    medianResolutionHours: z.number().nullable(),
    // breakdown charts — active backlog (OPEN + IN_PROGRESS)
    byPriority: z.array(PriorityBreakdownSchema),
    byCategory: z.array(CategoryBreakdownSchema),
    // team performance table
    byAssignee: z.array(AssigneeStatsSchema)
});

export type TicketStatsQuery = z.infer<typeof TicketStatsQuerySchema>;
export type AssigneeStats = z.infer<typeof AssigneeStatsSchema>;
export type TicketStats = z.infer<typeof TicketStatsSchema>;
