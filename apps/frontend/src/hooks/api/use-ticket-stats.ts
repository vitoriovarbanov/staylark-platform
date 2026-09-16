import { useQuery } from '@tanstack/react-query';
import type { TicketStats } from '@staylark/contract';
import { api } from '@/lib/api';
import { ticketKeys } from './query-keys';

export function useTicketStats(
    startDate?: string,
    endDate?: string,
    propertyId?: string,
    options?: { enabled?: boolean }
) {
    return useQuery<{ data: TicketStats }>({
        queryKey: ticketKeys.stats(startDate, endDate, propertyId),
        queryFn: () => {
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (propertyId) params.set('propertyId', propertyId);
            const qs = params.toString();
            return api.get(`/api/admin/stats/tickets${qs ? `?${qs}` : ''}`).then(r => r.data);
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        enabled: options?.enabled ?? true
    });
}
