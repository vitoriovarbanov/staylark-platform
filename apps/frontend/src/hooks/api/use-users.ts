import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { AdminUpdateUser, AdminUser, UserListQuery, UserListResponse } from '@staylark/contract';
import { api } from '../../lib/api';
import { userKeys } from './query-keys';

/** ADMIN-only: paginated, filtered user list for the management table. */
export function useUsers(filters: Partial<UserListQuery>) {
    return useQuery<UserListResponse>({
        queryKey: userKeys.list(filters),
        queryFn: () => api.get('/api/users', { params: filters }).then(r => r.data),
        placeholderData: keepPreviousData
    });
}

/** Invalidate every user query (lists + the managers dropdown) after a mutation. */
function useInvalidateUsers() {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        queryClient.invalidateQueries({ queryKey: userKeys.managers() });
    };
}

export function useUpdateUser() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: AdminUpdateUser }) =>
            api.patch<{ data: AdminUser }>(`/api/users/${id}`, data).then(r => r.data.data),
        onSuccess: invalidate
    });
}

/**
 * Soft-delete, surfaced to admins as "deactivate" — it is reversible.
 * `successorManagerId` is required when deactivating a MANAGER: their properties
 * and open tickets transfer to that manager rather than being orphaned.
 */
export function useDeactivateUser() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: ({ id, successorManagerId }: { id: string; successorManagerId?: string }) =>
            api.delete(`/api/users/${id}`, { data: { successorManagerId } }),
        onSuccess: invalidate
    });
}

export function useActivateUser() {
    const invalidate = useInvalidateUsers();
    return useMutation({
        mutationFn: (id: string) => api.post(`/api/users/${id}/restore`),
        onSuccess: invalidate
    });
}
