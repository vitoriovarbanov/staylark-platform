import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PricingRule, PricingRuleCreate } from '@staylark/contract';
import { api } from '../../lib/api';
import { adminPricingKeys } from '../api/query-keys';

export function useCreateOverride() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: PricingRuleCreate) => api.post<PricingRule>('/api/pricing/rules', data).then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminPricingKeys.overrides() });
            // refetchType: 'all' forces previously-loaded quote queries to refetch
            // even when the Properties tab is unmounted, so cached values update.
            queryClient.invalidateQueries({ queryKey: adminPricingKeys.quotes(), refetchType: 'all' });
        }
    });
}
