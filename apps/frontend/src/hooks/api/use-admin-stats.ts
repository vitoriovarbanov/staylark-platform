import { useQuery } from '@tanstack/react-query';
import type { AdminStats } from '@staylark/contract';
import { api } from '@/lib/api';
import { adminStatsKeys } from './query-keys';

export function useAdminStats() {
    return useQuery<{ data: AdminStats }>({
        queryKey: adminStatsKeys.stats(),
        queryFn: () => api.get('/api/admin/stats').then(r => r.data),
        staleTime: 60_000
    });
}
