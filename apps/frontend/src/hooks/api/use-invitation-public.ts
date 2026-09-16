import { useMutation, useQuery } from '@tanstack/react-query';
import type { AcceptInvitation, InvitationPublic } from '@staylark/contract';
import { api } from '../../lib/api';
import { invitationKeys } from './query-keys';

/**
 * Public: look up a pending invitation by its raw token. The query is disabled
 * when no token is present, and any error (including a 404) surfaces to the
 * caller so the page can render its "invalid or expired" terminal state.
 */
export function useInvitation(token: string) {
    return useQuery<InvitationPublic>({
        queryKey: invitationKeys.detail(token),
        queryFn: () => api.get<{ data: InvitationPublic }>(`/api/invitations/${token}`).then(r => r.data.data),
        enabled: Boolean(token),
        retry: false
    });
}

/**
 * Public: accept an invitation — creates the User+Account server-side and sets
 * the Better Auth session cookie on the response. Caller refreshes the session
 * and redirects by role afterwards.
 */
export function useAcceptInvitation(token: string) {
    return useMutation<{ token?: string }, unknown, AcceptInvitation>({
        mutationFn: (data: AcceptInvitation) =>
            api.post<{ token?: string }>(`/api/invitations/${token}/accept`, data).then(r => {
                // The accept flow bypasses authClient, so persist the Bearer token
                // ourselves — lib/api.ts reads it back for the Authorization header.
                if (r.data?.token) localStorage.setItem('better-auth.session_token', r.data.token);
                return r.data;
            })
    });
}
