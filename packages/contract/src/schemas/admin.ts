import { z } from 'zod';
import { BookingStatusEnum } from './booking.js';
import { TicketCategoryEnum, TicketPriorityEnum, TicketStatusEnum } from './ticket.js';

export const AdminStatsTotalsSchema = z.object({
    /**
     * Distinct guests who have booked this manager's properties. Replaces the
     * org-wide user count, which has no meaning for a single portfolio now that
     * the dashboard is manager-scoped.
     */
    guestsHosted: z.number().int().nonnegative(),
    properties: z.number().int().nonnegative(),
    activeBookings: z.number().int().nonnegative(),
    openTickets: z.number().int().nonnegative(),
    revenue: z.number().nonnegative(),
    avgOccupancy: z.number().min(0).max(100)
});

export const OccupancyPointSchema = z.object({
    month: z.string(), // "YYYY-MM"
    occupancy: z.number().min(0).max(100)
});

export const AdminRecentBookingSchema = z.object({
    id: z.string().uuid(),
    propertyTitle: z.string(),
    guestName: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    totalPrice: z.number().nonnegative(),
    status: BookingStatusEnum
});

export const AdminCriticalTicketSchema = z.object({
    id: z.string().uuid(),
    propertyTitle: z.string(),
    category: TicketCategoryEnum.nullable(),
    priority: TicketPriorityEnum,
    status: TicketStatusEnum,
    createdAt: z.string()
});

export const AdminStatsSchema = z.object({
    totals: AdminStatsTotalsSchema,
    occupancyTrend: z.array(OccupancyPointSchema),
    recentBookings: z.array(AdminRecentBookingSchema),
    criticalTickets: z.array(AdminCriticalTicketSchema)
});

/** Per-property performance row for the admin "Property performance" table. */
export const AdminPropertyStatsSchema = z.object({
    propertyId: z.string().uuid(),
    title: z.string(),
    city: z.string(),
    occupancy: z.number().min(0).max(100), // current calendar month, %
    revenue: z.number().nonnegative(), // completed bookings, all-time
    adr: z.number().nonnegative(), // avg daily rate = revenue / completed nights
    bookings: z.number().int().nonnegative(), // CONFIRMED + ACTIVE + COMPLETED
    activeBookings: z.number().int().nonnegative(), // CONFIRMED + ACTIVE
    openTickets: z.number().int().nonnegative() // OPEN + IN_PROGRESS
});

export type AdminStatsTotals = z.infer<typeof AdminStatsTotalsSchema>;
export type OccupancyPoint = z.infer<typeof OccupancyPointSchema>;
export type AdminRecentBooking = z.infer<typeof AdminRecentBookingSchema>;
export type AdminCriticalTicket = z.infer<typeof AdminCriticalTicketSchema>;
export type AdminStats = z.infer<typeof AdminStatsSchema>;
export type AdminPropertyStats = z.infer<typeof AdminPropertyStatsSchema>;
