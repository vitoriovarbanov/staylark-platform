import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Booking, CreateBooking, BookingQuery, Property, PaginatedResponse } from '@staylark/contract';
import { api } from '@/lib/api';
import { bookingKeys, propertyKeys } from './query-keys';

export type BookingWithRelations = Booking & {
    property: Property;
    user?: { id: string; name: string; email: string };
};

export function useBookings(filters?: Partial<BookingQuery>) {
    return useQuery<PaginatedResponse<BookingWithRelations>>({
        queryKey: bookingKeys.list(filters),
        queryFn: () => {
            const params = filters ? { ...filters } : undefined;
            return api.get('/api/bookings', { params }).then(r => r.data);
        }
    });
}

export function useBooking(id: string) {
    return useQuery<{ data: Booking }>({
        queryKey: bookingKeys.detail(id),
        queryFn: () => api.get(`/api/bookings/${id}`).then(r => r.data),
        enabled: !!id
    });
}

export function useCreateBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateBooking) => api.post<{ data: Booking }>('/api/bookings', data).then(r => r.data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
            queryClient.invalidateQueries({
                queryKey: propertyKeys.availability(variables.propertyId)
            });
        }
    });
}

export function useConfirmBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, notify = false }: { id: string; notify?: boolean }) =>
            api
                .patch<{ data: Booking }>(`/api/bookings/${id}/confirm`, undefined, {
                    params: { notify: notify ? 'true' : 'false' }
                })
                .then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: bookingKeys.pendingNearExpiryCount() });
        }
    });
}

export function useCancelBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.patch<{ data: Booking }>(`/api/bookings/${id}/cancel`).then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: bookingKeys.pendingNearExpiryCount() });
        }
    });
}

export function usePendingNearExpiryCount(enabled: boolean) {
    return useQuery<{ data: { count: number } }>({
        queryKey: bookingKeys.pendingNearExpiryCount(),
        queryFn: () => api.get('/api/bookings/pending-near-expiry-count').then(r => r.data),
        enabled,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true
    });
}

export function useAllPendingCount(enabled: boolean) {
    return useQuery<PaginatedResponse<BookingWithRelations>>({
        queryKey: bookingKeys.list({ status: 'PENDING', page: 1, limit: 1 }),
        queryFn: () => api.get('/api/bookings', { params: { status: 'PENDING', page: 1, limit: 1 } }).then(r => r.data),
        enabled,
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true
    });
}
