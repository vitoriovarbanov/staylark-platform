import { useQuery } from '@tanstack/react-query';
import type { PricingRuleListQuery, PricingRulesListResponse } from '@staylark/contract';
import { api } from '../../lib/api';
import { adminPricingKeys } from '../api/query-keys';

export function useOverridesList(filters: Partial<PricingRuleListQuery>) {
    return useQuery<PricingRulesListResponse>({
        queryKey: adminPricingKeys.overridesList(filters),
        queryFn: () => api.get<PricingRulesListResponse>('/api/pricing/rules', { params: filters }).then(r => r.data),
        staleTime: 30_000
    });
}
