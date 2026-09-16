import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateInvitation, Invitation, InvitationListResponse } from '@staylark/contract';
import { api } from '../../lib/api';
import { invitationKeys, userKeys } from './query-keys';

/** ADMIN-only: list of invitations for the pending-invitations section. */
export function useInvitations() {
    return useQuery<Invitation[]>({
        queryKey: invitationKeys.list(),
        queryFn: () => api.get<InvitationListResponse>('/api/users/invitations').then(r => r.data.data)
    });
}

export function useCreateInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateInvitation) =>
            api.post<{ data: Invitation }>('/api/users/invitations', data).then(r => r.data.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: invitationKeys.list() });
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        }
    });
}

export function useResendInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post(`/api/users/invitations/${id}/resend`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: invitationKeys.list() });
        }
    });
}

export function useRevokeInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post(`/api/users/invitations/${id}/revoke`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: invitationKeys.list() });
        }
    });
}
