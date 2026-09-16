import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MyProfileResponse, UpdateMyProfile } from '@staylark/contract';
import { api } from '@/lib/api';
import { profileKeys } from './query-keys';

export function useMyProfile() {
    return useQuery<MyProfileResponse>({
        queryKey: profileKeys.me(),
        queryFn: async () => {
            const res = await api.get<{ data: MyProfileResponse }>('/api/me/profile');
            return res.data.data;
        }
    });
}

export function useUpdateMyProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpdateMyProfile) => {
            const res = await api.patch<{ data: MyProfileResponse['profile'] }>('/api/me/profile', payload);
            return res.data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.me() })
    });
}
