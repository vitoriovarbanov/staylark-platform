import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Stack, Button, Center, Group, Pagination } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconFileSpreadsheet, IconPlus } from '@tabler/icons-react';
import type {
    Property,
    CreateProperty,
    PropertyType,
    PropertySortFieldValue,
    PropertySortOrderValue
} from '@staylark/contract';
import {
    useProperties,
    useCreateProperty,
    useUpdateProperty,
    useDeleteProperty,
    useTransferProperty,
    useClaimProperty
} from '../../../hooks/api/use-properties';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { PropertiesFilterBar } from './components/PropertiesFilterBar';
import { PropertyTable } from './components/PropertyTable';
import { PropertyFormModal } from './components/PropertyFormModal';
import { TransferManagerModal } from './components/TransferManagerModal';
import { BulkImportModal } from './components/BulkImportModal';

const PAGE_LIMIT = 20;

export function AdminPropertiesPage() {
    // Managers own their properties: create, edit, delete and transfer are all theirs.
    // Admins never reach this page (route guard + backend guard).
    const [opened, { open, close }] = useDisclosure(false);
    const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [transferProperty, setTransferProperty] = useState<Property | null>(null);
    const { user } = useAuth();

    const [searchParams, setSearchParams] = useSearchParams();
    const city = searchParams.get('city') ?? '';
    const type = (searchParams.get('type') as PropertyType | null) ?? null;
    const sort = searchParams.get('sort');
    const order = (searchParams.get('order') as PropertySortOrderValue | null) ?? 'desc';
    const page = Number(searchParams.get('page') ?? '1');

    // Local city input, debounced before it hits the URL/query.
    const [cityInput, setCityInput] = useState(city);
    const [debouncedCity] = useDebouncedValue(cityInput, 250);

    const updateParams = useCallback(
        (patch: Record<string, string | null>) => {
            setSearchParams(prev => {
                for (const [key, value] of Object.entries(patch)) {
                    if (value === null || value === '') prev.delete(key);
                    else prev.set(key, value);
                }
                prev.delete('page');
                return prev;
            });
        },
        [setSearchParams]
    );

    // Push the debounced city into the URL (resetting to page 1).
    useEffect(() => {
        if (debouncedCity === city) return;
        updateParams({ city: debouncedCity || null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedCity]);

    const handleSortChange = useCallback(
        (nextSortBy: string | null, nextSortOrder: 'asc' | 'desc') => {
            updateParams({ sort: nextSortBy, order: nextSortBy ? nextSortOrder : null });
        },
        [updateParams]
    );

    const handleClear = useCallback(() => {
        setCityInput('');
        setSearchParams(prev => {
            prev.delete('city');
            prev.delete('type');
            prev.delete('sort');
            prev.delete('order');
            prev.delete('page');
            return prev;
        });
    }, [setSearchParams]);

    const handlePageChange = useCallback(
        (next: number) => {
            setSearchParams(prev => {
                prev.set('page', String(next));
                return prev;
            });
        },
        [setSearchParams]
    );

    const { data: propertiesData, isLoading } = useProperties({
        ...(city && { city }),
        ...(type && { type }),
        ...(sort && { sort: sort as PropertySortFieldValue, order }),
        page,
        limit: PAGE_LIMIT
    });
    const totalPages = Math.ceil((propertiesData?.total ?? 0) / PAGE_LIMIT);
    const createMutation = useCreateProperty();
    const updateMutation = useUpdateProperty();
    const deleteMutation = useDeleteProperty();
    const transferMutation = useTransferProperty();
    const claimMutation = useClaimProperty();

    const handleEdit = (property: Property) => {
        setEditingProperty(property);
        open();
    };

    const handleCreate = () => {
        setEditingProperty(null);
        open();
    };

    const handleClose = () => {
        close();
        setEditingProperty(null);
    };

    const handleSubmit = async (values: CreateProperty) => {
        try {
            if (editingProperty) {
                await updateMutation.mutateAsync({ id: editingProperty.id, data: values });
                notifications.show({ title: 'Success', message: 'Property updated', color: 'green' });
            } else {
                await createMutation.mutateAsync(values);
                notifications.show({ title: 'Success', message: 'Property created', color: 'green' });
            }
            handleClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong';
            notifications.show({ title: 'Error', message, color: 'red' });
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteMutation.mutateAsync(id);
            notifications.show({ title: 'Success', message: 'Property deleted', color: 'green' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete property';
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleTransfer = async (managerId: string) => {
        if (!transferProperty) return;
        try {
            await transferMutation.mutateAsync({ id: transferProperty.id, managerId });
            notifications.show({
                title: 'Property transferred',
                message: `${transferProperty.title} now belongs to another manager.`,
                color: 'green'
            });
            setTransferProperty(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to transfer property';
            notifications.show({ title: 'Error', message, color: 'red' });
        }
    };

    const handleClaim = async (id: string) => {
        setClaimingId(id);
        try {
            await claimMutation.mutateAsync(id);
            notifications.show({ title: 'Property claimed', message: 'It is now yours to manage.', color: 'green' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to claim property';
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setClaimingId(null);
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <Stack>
            <PageHeader
                title='Property Management'
                actions={
                    <Group gap='sm'>
                        <Button variant='default' leftSection={<IconFileSpreadsheet size={16} />} onClick={openImport}>
                            Bulk Import
                        </Button>
                        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
                            Add Property
                        </Button>
                    </Group>
                }
            />

            <PropertiesFilterBar
                city={cityInput}
                type={type}
                sortBy={sort}
                sortOrder={order}
                onChangeCity={setCityInput}
                onChangeType={value => updateParams({ type: value })}
                onSortChange={handleSortChange}
                onClear={handleClear}
            />

            <PropertyTable
                properties={propertiesData?.data ?? []}
                isLoading={isLoading}
                deletingId={deletingId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTransfer={setTransferProperty}
                onClaim={handleClaim}
                claimingId={claimingId}
                viewerId={user?.id}
                canManage
            />

            {totalPages > 1 && (
                <Center>
                    <Pagination value={page} onChange={handlePageChange} total={totalPages} size='sm' />
                </Center>
            )}

            <PropertyFormModal
                opened={opened}
                property={editingProperty}
                isSaving={isSaving}
                onClose={handleClose}
                onSubmit={handleSubmit}
            />

            <TransferManagerModal
                property={transferProperty}
                isSaving={transferMutation.isPending}
                onClose={() => setTransferProperty(null)}
                onSubmit={handleTransfer}
            />

            <BulkImportModal opened={importOpened} onClose={closeImport} />
        </Stack>
    );
}
