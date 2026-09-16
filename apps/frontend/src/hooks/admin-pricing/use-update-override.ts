import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PricingRule, PricingRuleUpdate } from '@staylark/contract';
import { api } from '../../lib/api';
import { adminPricingKeys } from '../api/query-keys';

export function useUpdateOverride() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: PricingRuleUpdate }) =>
            api.patch<PricingRule>(`/api/pricing/rules/${id}`, data).then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminPricingKeys.overrides() });
            queryClient.invalidateQueries({ queryKey: adminPricingKeys.quotes(), refetchType: 'all' });
        }
    });
}
