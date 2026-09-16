import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PricingRule } from '@staylark/contract';
import { api } from '../../lib/api';
import { adminPricingKeys } from '../api/query-keys';

export function useDeactivateOverride() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete<PricingRule>(`/api/pricing/rules/${id}`).then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminPricingKeys.overrides() });
            queryClient.invalidateQueries({ queryKey: adminPricingKeys.quotes(), refetchType: 'all' });
        }
    });
}
