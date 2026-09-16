import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CategoryRoutingList, TicketCategory } from '@staylark/contract';
import { api } from '@/lib/api';

const ticketRoutingKeys = { all: ['ticket-routing'] as const };

export function useTicketRouting(enabled = true) {
    return useQuery<CategoryRoutingList>({
        queryKey: ticketRoutingKeys.all,
        queryFn: async () => (await api.get<{ data: CategoryRoutingList }>('/api/admin/ticket-routing')).data.data,
        enabled,
        staleTime: 60_000
    });
}

export function useUpdateCategoryRouting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { category: TicketCategory; userIds: string[] }) =>
            (
                await api.put<{ data: CategoryRoutingList }>(`/api/admin/ticket-routing/${input.category}`, {
                    userIds: input.userIds
                })
            ).data.data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketRoutingKeys.all })
    });
}
