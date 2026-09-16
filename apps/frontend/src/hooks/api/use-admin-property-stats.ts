import { useQuery } from '@tanstack/react-query';
import type { AdminPropertyStats } from '@staylark/contract';
import { api } from '@/lib/api';
import { adminStatsKeys } from './query-keys';

export function useAdminPropertyStats() {
    return useQuery<{ data: AdminPropertyStats[] }>({
        queryKey: adminStatsKeys.properties(),
        queryFn: () => api.get('/api/admin/stats/properties').then(r => r.data),
        staleTime: 60_000
    });
}
