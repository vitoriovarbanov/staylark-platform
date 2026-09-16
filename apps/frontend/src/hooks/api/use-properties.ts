import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type {
    Property,
    CreateProperty,
    UpdateProperty,
    PropertyFilter,
    PaginatedResponse,
    PropertyAvailabilityStatus,
    AvailabilityStatus,
    PropertyRangeAvailability,
    ImportResult
} from '@staylark/contract';
import { api } from '../../lib/api';
import { downloadBlob } from '../../lib/download-blob';
import { propertyKeys } from './query-keys';

interface DateRange {
    checkIn: string;
    checkOut: string;
}

function expandRanges(ranges: DateRange[]): Set<string> {
    const dates = new Set<string>();
    for (const range of ranges) {
        let current = dayjs(range.checkIn);
        const end = dayjs(range.checkOut);
        while (current.isBefore(end)) {
            dates.add(current.format('YYYY-MM-DD'));
            current = current.add(1, 'day');
        }
    }
    return dates;
}

export function usePropertyAvailability(propertyId: string) {
    return useQuery({
        queryKey: propertyKeys.availability(propertyId),
        queryFn: async () => {
            const { data } = await api.get<{ data: DateRange[] }>(`/api/properties/${propertyId}/availability`);
            return expandRanges(data.data);
        },
        enabled: !!propertyId
    });
}

/**
 * Live availability status for a batch of properties, keyed by id.
 * Missing ids (e.g. while loading) should be treated as AVAILABLE by callers.
 */
export function usePropertiesAvailabilityStatus(ids: string[]) {
    return useQuery({
        queryKey: propertyKeys.availabilityStatuses(ids),
        queryFn: async () => {
            const { data } = await api.get<{ data: PropertyAvailabilityStatus[] }>(
                '/api/properties/availability-status',
                { params: { ids: ids.join(',') } }
            );
            return Object.fromEntries(data.data.map(s => [s.id, s.status])) as Record<string, AvailabilityStatus>;
        },
        enabled: ids.length > 0
    });
}

/**
 * Availability of a batch of properties for a specific search window, keyed by id.
 * Only runs when a full date range is present. Ids absent from the map (still
 * loading, or no dates) should be treated as available by callers.
 */
export function usePropertiesRangeAvailability(ids: string[], checkIn: string, checkOut: string) {
    return useQuery({
        queryKey: propertyKeys.rangeAvailability(ids, checkIn, checkOut),
        queryFn: async () => {
            const { data } = await api.get<{ data: PropertyRangeAvailability[] }>(
                '/api/properties/range-availability',
                { params: { ids: ids.join(','), checkIn, checkOut } }
            );
            return Object.fromEntries(data.data.map(a => [a.id, a])) as Record<string, PropertyRangeAvailability>;
        },
        enabled: ids.length > 0 && !!checkIn && !!checkOut
    });
}

export function useProperties(filters?: PropertyFilter) {
    return useQuery<PaginatedResponse<Property>>({
        queryKey: propertyKeys.list(filters),
        queryFn: () => {
            // Serialize amenities as comma-separated string to avoid bracket notation
            // (Express doesn't map amenities[] → amenities)
            const params = filters
                ? {
                      ...filters,
                      amenities: filters.amenities?.length ? filters.amenities.join(',') : undefined
                  }
                : undefined;
            return api.get('/api/properties', { params }).then(r => r.data);
        }
    });
}

export function useAmenities() {
    return useQuery<{ data: string[] }>({
        queryKey: propertyKeys.amenities(),
        queryFn: () => api.get('/api/properties/amenities').then(r => r.data),
        staleTime: 5 * 60 * 1000 // 5 min — amenities change rarely
    });
}

export function useCities() {
    return useQuery<{ data: string[] }>({
        queryKey: propertyKeys.cities(),
        queryFn: () => api.get('/api/properties/cities').then(r => r.data),
        staleTime: 10 * 60 * 1000 // 10 min — cities change rarely
    });
}

export function useProperty(id: string) {
    return useQuery<{ data: Property }>({
        queryKey: propertyKeys.detail(id),
        queryFn: () => api.get(`/api/properties/${id}`).then(r => r.data),
        enabled: !!id
    });
}

export function useCreateProperty() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateProperty) => api.post<{ data: Property }>('/api/properties', data).then(r => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
        }
    });
}

export function useUpdateProperty() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateProperty }) =>
            api.patch<{ data: Property }>(`/api/properties/${id}`, data).then(r => r.data),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: propertyKeys.detail(id) });
        }
    });
}

export function useDeleteProperty() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/api/properties/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
        }
    });
}

/**
 * Hands a property to another manager. The property leaves the caller's
 * portfolio immediately, so both the list and the detail cache are invalidated.
 */
export function useTransferProperty() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, managerId }: { id: string; managerId: string }) =>
            api.patch<{ data: Property }>(`/api/properties/${id}/manager`, { managerId }).then(r => r.data),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: propertyKeys.detail(id) });
        }
    });
}

/**
 * Claims a property that has no manager. Only legacy rows can be in that state —
 * manager removal now always names a successor.
 */
export function useClaimProperty() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<{ data: Property }>(`/api/properties/${id}/claim`).then(r => r.data),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: propertyKeys.detail(id) });
        }
    });
}

/**
 * Bulk-creates properties from a spreadsheet. All-or-nothing: on a 422 nothing was
 * created, and `error.response.data.details.errors` holds every problem in the file.
 */
export function useImportProperties() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File) => {
            const body = new FormData();
            body.append('file', file);
            // No explicit Content-Type — the browser must set the multipart boundary.
            const { data } = await api.post<{ data: ImportResult }>('/api/properties/import', body);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
            // A fresh import can introduce amenities the filter bar has not seen.
            queryClient.invalidateQueries({ queryKey: propertyKeys.amenities() });
            queryClient.invalidateQueries({ queryKey: propertyKeys.cities() });
        }
    });
}

/** Downloads the import template. Generated server-side, so it always matches the parser. */
export function useDownloadTemplate() {
    return useMutation({
        mutationFn: async () => {
            const response = await api.get('/api/properties/import/template', { responseType: 'blob' });
            downloadBlob(response.data as Blob, 'staylark-properties-template.xlsx');
        }
    });
}
