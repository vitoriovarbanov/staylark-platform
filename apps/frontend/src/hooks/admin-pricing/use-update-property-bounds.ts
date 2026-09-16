import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, Property, UpdateProperty } from '@staylark/contract';
import { api } from '../../lib/api';
import { propertyKeys } from '../api/query-keys';

type BoundsPatch = Pick<UpdateProperty, 'minNightlyPrice' | 'maxNightlyPrice'>;

interface MutationContext {
    previous: Array<[readonly unknown[], PaginatedResponse<Property> | undefined]>;
}

export function useUpdatePropertyBounds() {
    const queryClient = useQueryClient();

    return useMutation<Property, unknown, { id: string; patch: BoundsPatch }, MutationContext>({
        mutationFn: ({ id, patch }) => api.patch<Property>(`/api/properties/${id}`, patch).then(r => r.data),

        onMutate: async ({ id, patch }) => {
            await queryClient.cancelQueries({ queryKey: propertyKeys.lists() });

            const previous = queryClient.getQueriesData<PaginatedResponse<Property>>({
                queryKey: propertyKeys.lists()
            });

            queryClient.setQueriesData<PaginatedResponse<Property>>({ queryKey: propertyKeys.lists() }, old => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.map(p =>
                        p.id === id
                            ? {
                                  ...p,
                                  ...(patch.minNightlyPrice !== undefined && {
                                      minNightlyPrice: patch.minNightlyPrice
                                  }),
                                  ...(patch.maxNightlyPrice !== undefined && { maxNightlyPrice: patch.maxNightlyPrice })
                              }
                            : p
                    )
                };
            });

            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (!ctx) return;
            for (const [key, data] of ctx.previous) {
                queryClient.setQueryData(key, data);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
        }
    });
}
