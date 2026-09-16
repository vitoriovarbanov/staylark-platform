import type {
    PropertyFilter,
    BookingQuery,
    TicketQuery,
    PricingRuleListQuery,
    UserListQuery
} from '@staylark/contract';

/**
 * Centralized query key factory.
 *
 * Pattern: each domain has a hierarchy:
 *   all → lists (with filters) → detail (by id)
 *
 * This makes invalidation precise:
 *   queryClient.invalidateQueries({ queryKey: propertyKeys.all })  → clears everything
 *   queryClient.invalidateQueries({ queryKey: propertyKeys.lists() }) → clears all lists
 */
export const propertyKeys = {
    all: ['properties'] as const,
    lists: () => [...propertyKeys.all, 'list'] as const,
    list: (filters?: PropertyFilter) => [...propertyKeys.lists(), filters] as const,
    details: () => [...propertyKeys.all, 'detail'] as const,
    detail: (id: string) => [...propertyKeys.details(), id] as const,
    amenities: () => [...propertyKeys.all, 'amenities'] as const,
    cities: () => [...propertyKeys.all, 'cities'] as const,
    availability: (id: string) => [...propertyKeys.detail(id), 'availability'] as const,
    availabilityStatuses: (ids: string[]) => [...propertyKeys.all, 'availability-status', ids] as const,
    rangeAvailability: (ids: string[], checkIn: string, checkOut: string) =>
        [...propertyKeys.all, 'range-availability', checkIn, checkOut, ids] as const
};

export const feedbackKeys = {
    all: ['feedback'] as const,
    eligible: () => [...feedbackKeys.all, 'eligible'] as const,
    byBooking: (bookingId: string) => [...feedbackKeys.all, 'booking', bookingId] as const,
    aggregation: (
        propertyId: string,
        startDate?: string,
        endDate?: string,
        page = 1,
        limit = 10,
        sortBy?: string,
        sortOrder?: string
    ) => [...feedbackKeys.all, 'aggregation', propertyId, startDate, endDate, page, limit, sortBy, sortOrder] as const
};

export const ticketKeys = {
    all: ['tickets'] as const,
    lists: () => [...ticketKeys.all, 'list'] as const,
    list: (filters?: Partial<TicketQuery>) => [...ticketKeys.lists(), filters] as const,
    details: () => [...ticketKeys.all, 'detail'] as const,
    detail: (id: string) => [...ticketKeys.details(), id] as const,
    stats: (startDate?: string, endDate?: string, propertyId?: string) =>
        [...ticketKeys.all, 'stats', startDate, endDate, propertyId] as const,
    messages: (id: string) => [...ticketKeys.detail(id), 'messages'] as const,
    unreadCount: () => [...ticketKeys.all, 'unread-count'] as const
};

export const bookingKeys = {
    all: ['bookings'] as const,
    lists: () => [...bookingKeys.all, 'list'] as const,
    list: (filters?: Partial<BookingQuery>) => [...bookingKeys.lists(), filters] as const,
    details: () => [...bookingKeys.all, 'detail'] as const,
    detail: (id: string) => [...bookingKeys.details(), id] as const,
    pendingNearExpiryCount: () => [...bookingKeys.all, 'pending-near-expiry-count'] as const
};

export const pricingKeys = {
    all: ['pricing'] as const,
    quotes: () => [...pricingKeys.all, 'quote'] as const,
    quote: (propertyId: string, checkIn: string, checkOut: string) =>
        [...pricingKeys.quotes(), propertyId, checkIn, checkOut] as const
};

export const userKeys = {
    all: ['users'] as const,
    managers: () => [...userKeys.all, 'managers'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters?: Partial<UserListQuery>) => [...userKeys.lists(), filters] as const
};

export const invitationKeys = {
    all: ['invitations'] as const,
    list: () => [...invitationKeys.all, 'list'] as const,
    details: () => [...invitationKeys.all, 'detail'] as const,
    detail: (token: string) => [...invitationKeys.details(), token] as const
};

export const adminPricingKeys = {
    all: ['admin-pricing'] as const,
    model: () => [...adminPricingKeys.all, 'model'] as const,
    overrides: () => [...adminPricingKeys.all, 'overrides'] as const,
    overridesList: (filters?: Partial<PricingRuleListQuery>) => [...adminPricingKeys.overrides(), filters] as const,
    quotes: () => [...adminPricingKeys.all, 'quote'] as const,
    quote: (propertyId: string, checkIn: string, checkOut: string) =>
        [...adminPricingKeys.quotes(), propertyId, checkIn, checkOut] as const
};

export const adminStatsKeys = {
    all: ['admin-stats'] as const,
    stats: () => [...adminStatsKeys.all, 'overview'] as const,
    properties: () => [...adminStatsKeys.all, 'properties'] as const
};

export const profileKeys = {
    all: ['profile'] as const,
    me: () => [...profileKeys.all, 'me'] as const
};
