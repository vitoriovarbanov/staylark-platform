import { useQuery } from '@tanstack/react-query';
import type { ManagerSummary } from '@staylark/contract';
import { api } from '../../lib/api';
import { userKeys } from './query-keys';

/**
 * Lists MANAGER users for assignment dropdowns — ticket assignee, property
 * transfer target, successor picker. Manager-accessible (and admin-accessible),
 * but returns 403 for a plain USER, so callers should gate the request.
 * Admins are not included: they can neither manage a property nor hold a ticket.
 */
export function useManagers(enabled = true) {
    return useQuery<ManagerSummary[]>({
        queryKey: userKeys.managers(),
        queryFn: async () => {
            const { data } = await api.get<{ data: ManagerSummary[] }>('/api/users/managers');
            return data.data;
        },
        enabled,
        staleTime: 60_000
    });
}
