import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Feedback, EligibleFeedbackResponse, FeedbackAggregation, FeedbackSortField } from '@staylark/contract';
import { api } from '@/lib/api';
import { feedbackKeys } from './query-keys';

export function useFeedbackByBooking(bookingId: string, enabled = true) {
    return useQuery<{ data: Feedback }>({
        queryKey: feedbackKeys.byBooking(bookingId),
        queryFn: () => api.get(`/api/feedback/booking/${bookingId}`).then(r => r.data),
        enabled,
        retry: false // 404 means no feedback — don't retry
    });
}

export function useEligibleFeedback(enabled = true) {
    return useQuery<EligibleFeedbackResponse>({
        queryKey: feedbackKeys.eligible(),
        queryFn: () => api.get('/api/feedback/eligible').then(r => r.data),
        enabled,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
}

export function useFeedbackAggregation(
    propertyId: string | null,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 10,
    sortBy?: FeedbackSortField,
    sortOrder: 'asc' | 'desc' = 'desc'
) {
    return useQuery<{ data: FeedbackAggregation }>({
        queryKey: feedbackKeys.aggregation(propertyId ?? '', startDate, endDate, page, limit, sortBy, sortOrder),
        queryFn: () => {
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            params.set('page', String(page));
            params.set('limit', String(limit));
            if (sortBy) params.set('sortBy', sortBy);
            params.set('sortOrder', sortOrder);
            return api.get(`/api/feedback/property/${propertyId}?${params.toString()}`).then(r => r.data);
        },
        enabled: !!propertyId,
        staleTime: 2 * 60 * 1000 // 2 minutes
    });
}

export function useSubmitFeedback() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { propertyId: string; bookingId: string; audio?: Blob; text?: string }) => {
            const formData = new FormData();
            formData.append('propertyId', data.propertyId);
            formData.append('bookingId', data.bookingId);

            if (data.audio) {
                const ext = data.audio.type === 'audio/mp4' ? 'mp4' : data.audio.type === 'audio/ogg' ? 'ogg' : 'webm';
                formData.append('audio', data.audio, `recording.${ext}`);
            }
            if (data.text) {
                formData.append('text', data.text);
            }

            return api.post<{ data: Feedback }>('/api/feedback', formData).then(r => r.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
        }
    });
}
