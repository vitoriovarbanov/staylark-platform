import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TicketMessage, TicketReplyLanguage } from '@staylark/contract';
import { api } from '@/lib/api';
import { ticketKeys } from './query-keys';

export function useTicketMessages(ticketId: string | null, enabled = true) {
    return useQuery<{ data: TicketMessage[] }>({
        queryKey: ticketKeys.messages(ticketId ?? ''),
        queryFn: () => api.get(`/api/tickets/${ticketId}/messages`).then(r => r.data),
        enabled: !!ticketId && enabled
    });
}

export function useSendTicketMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: { ticketId: string; body: string }) =>
            api
                .post<{ data: TicketMessage }>(`/api/tickets/${input.ticketId}/messages`, { body: input.body })
                .then(r => r.data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        }
    });
}

/** Reporter-only read stamp — clears the unread badge on list cards + the header count. */
export function useMarkTicketSeen() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ticketId: string) => api.post(`/api/tickets/${ticketId}/seen`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
        }
    });
}

/**
 * Total unread staff replies across the reporter's tickets — drives the
 * "My Reports" header badge. Keyed under ticketKeys.all, so the live socket
 * handler (which invalidates ticketKeys.all) refreshes it in real time.
 */
export function useTicketUnreadCount(enabled = true) {
    return useQuery<{ data: { count: number } }>({
        queryKey: ticketKeys.unreadCount(),
        queryFn: () => api.get('/api/tickets/unread-count').then(r => r.data),
        enabled,
        refetchOnWindowFocus: true
    });
}

/**
 * Drafts an AI reply suggestion for staff. No cache changes — pure read.
 * An explicit `language` forces the reply language; omit it to auto-detect
 * from the guest's original report.
 */
export function useSuggestReply() {
    return useMutation({
        mutationFn: ({ ticketId, language }: { ticketId: string; language?: TicketReplyLanguage }) =>
            api
                .post<{
                    data: { suggestion: string };
                }>(`/api/tickets/${ticketId}/suggest-reply`, language ? { language } : {})
                .then(r => r.data)
    });
}
