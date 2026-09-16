import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Ticket, TicketListResponse, TicketQuery, TicketStatus } from '@staylark/contract';
import { api } from '@/lib/api';
import { audioBlobExtension } from '@/features/audio-recording/hooks/useAudioRecorder';
import { buildListParams } from '@/lib/list-params';
import { ticketKeys } from './query-keys';

export function useTickets(filters: Partial<TicketQuery> = {}, enabled = true) {
    return useQuery<{ data: TicketListResponse }>({
        queryKey: ticketKeys.list(filters),
        enabled,
        queryFn: () => {
            const qs = buildListParams({
                status: filters.status,
                priority: filters.priority,
                category: filters.category,
                propertyId: filters.propertyId,
                assignedToId: filters.assignedToId,
                needsAssignment: filters.needsAssignment ? 'true' : undefined,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder,
                page: filters.page,
                limit: filters.limit
            });
            return api.get(`/api/tickets${qs}`).then(r => r.data);
        }
    });
}

export function useTicket(id: string | null, enabled = true) {
    return useQuery<{ data: Ticket }>({
        queryKey: ticketKeys.detail(id ?? ''),
        queryFn: () => api.get(`/api/tickets/${id}`).then(r => r.data),
        enabled: !!id && enabled
    });
}

export interface SubmitTicketInput {
    propertyId: string;
    bookingId: string;
    audio?: Blob;
    text?: string;
}

export function useSubmitTicket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: SubmitTicketInput) => {
            const formData = new FormData();
            formData.append('propertyId', data.propertyId);
            formData.append('bookingId', data.bookingId);

            if (data.audio) {
                const ext = audioBlobExtension(data.audio.type);
                formData.append('audio', data.audio, `report.${ext}`);
            } else if (data.text) {
                formData.append('text', data.text);
            }

            return api.post<{ data: Ticket }>('/api/tickets', formData).then(r => r.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
        }
    });
}

/** A reporter withdrawing their own OPEN report (filed by mistake). Owner + OPEN-only enforced server-side. */
export function useWithdrawTicket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => api.post<{ data: Ticket }>(`/api/tickets/${id}/withdraw`).then(r => r.data),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
        }
    });
}

export function useReassignTicket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { id: string; assignedToId: string | null }) =>
            api
                .put<{ data: Ticket }>(`/api/tickets/${input.id}/assignee`, { assignedToId: input.assignedToId })
                .then(r => r.data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
        }
    });
}

export function useUpdateTicketStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { id: string; status: TicketStatus }) => {
            return api
                .put<{ data: Ticket }>(`/api/tickets/${input.id}/status`, { status: input.status })
                .then(r => r.data);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
        }
    });
}
