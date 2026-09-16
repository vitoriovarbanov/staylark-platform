import { useQuery } from '@tanstack/react-query';
import type { PricingResponse } from '@staylark/contract';
import { api } from '@/lib/api';
import { pricingKeys } from '@/hooks/api/query-keys';

export function usePricingQuote(propertyId: string, checkIn: string | null, checkOut: string | null) {
    const enabled = !!propertyId && !!checkIn && !!checkOut && checkIn < checkOut;

    return useQuery<PricingResponse>({
        queryKey: pricingKeys.quote(propertyId, checkIn ?? '', checkOut ?? ''),
        queryFn: () =>
            api
                .get<PricingResponse>(`/api/pricing/${propertyId}`, {
                    params: { checkIn, checkOut }
                })
                .then(r => r.data),
        enabled,
        staleTime: 60_000,
        retry: (failureCount, err: unknown) => {
            const status = (err as { status?: number }).status;
            // Hard client errors — fall back to static pricing, don't hammer.
            if (status === 400 || status === 404 || status === 429) return false;
            return failureCount < 2;
        }
    });
}
