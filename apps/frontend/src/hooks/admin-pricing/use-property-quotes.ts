import { useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { PricingResponse } from '@staylark/contract';
import { api } from '../../lib/api';
import { adminPricingKeys } from '../api/query-keys';

/**
 * Quote a 1-night stay starting on `checkIn` (YYYY-MM-DD) for each property.
 * Returns one `useQuery` result per propertyId, aligned by index.
 */
export function usePropertyQuotes(propertyIds: string[], checkIn: string, enabled: boolean) {
    const checkOut = dayjs(checkIn).add(1, 'day').format('YYYY-MM-DD');

    return useQueries({
        queries: propertyIds.map(id => ({
            queryKey: adminPricingKeys.quote(id, checkIn, checkOut),
            queryFn: () =>
                api.get<PricingResponse>(`/api/pricing/${id}`, { params: { checkIn, checkOut } }).then(r => r.data),
            enabled,
            staleTime: 60_000,
            retry: false
        }))
    });
}
