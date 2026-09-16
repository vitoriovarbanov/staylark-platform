import { useQuery } from '@tanstack/react-query';
import type { PricingModelMetadata } from '@staylark/contract';
import { api } from '../../lib/api';
import { adminPricingKeys } from '../api/query-keys';

export function useModelMetadata() {
    return useQuery<PricingModelMetadata>({
        queryKey: adminPricingKeys.model(),
        queryFn: () => api.get<PricingModelMetadata>('/api/pricing/model').then(r => r.data),
        staleTime: Infinity
    });
}
