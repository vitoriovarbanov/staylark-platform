import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ActionIcon, Alert, Badge, Center, Group, Menu, Pagination, Stack, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertTriangle,
    IconCalendarOff,
    IconDotsVertical,
    IconInfoCircle,
    IconLock,
    IconPencil,
    IconPlayerPause,
    IconPlayerPlay
} from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useAuth } from '@/contexts/auth-context';
import dayjs from 'dayjs';
import type { PricingRule, PricingRuleCreate, PricingRuleListQuery, Property } from '@staylark/contract';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef, RowDataAttributes } from '@/components/DataTable/types';
import { useProperties } from '@/hooks/api/use-properties';
import { useOverridesList } from '@/hooks/admin-pricing/use-overrides-list';
import { useCreateOverride } from '@/hooks/admin-pricing/use-create-override';
import { useUpdateOverride } from '@/hooks/admin-pricing/use-update-override';
import { useDeactivateOverride } from '@/hooks/admin-pricing/use-deactivate-override';
import { OverridesFilterBar } from './OverridesFilterBar';
import { OverrideFormModal } from './OverrideFormModal';
import { DeactivateConfirmModal } from './DeactivateConfirmModal';

const DATE_FORMAT = 'D MMM YYYY';
const ENGINE_CAP_MIN = 0.6;
const ENGINE_CAP_MAX = 1.8;
const PAGE_LIMIT = 20;

const TYPE_BADGE_COLOR: Record<string, string> = {
    SEASONAL: 'blue',
    DEMAND: 'violet',
    OCCUPANCY: 'teal',
    LAST_MINUTE: 'orange',
    DAY_OF_WEEK: 'pink',
    DURATION_DISCOUNT: 'green'
};

function formatPercent(multiplier: number): string {
    const percent = Math.round((multiplier - 1) * 100);
    if (percent === 0) return '0%';
    return percent > 0 ? `+${percent}%` : `${percent}%`;
}

function percentColor(multiplier: number): string {
    if (multiplier > 1) return 'green';
    if (multiplier < 1) return 'red';
    return 'gray';
}

function isOutsideEngineCap(multiplier: number): boolean {
    return multiplier < ENGINE_CAP_MIN || multiplier > ENGINE_CAP_MAX;
}

export function OverridesTab() {
    const { user } = useAuth();
    const isManager = user?.role === 'MANAGER';

    const [searchParams, setSearchParams] = useSearchParams();

    const propertyId = searchParams.get('propertyId');
    const activeOnParam = searchParams.get('activeOn');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const page = Number(searchParams.get('overridesPage') ?? '1');

    const filters: Partial<PricingRuleListQuery> = useMemo(
        () => ({
            propertyId: propertyId ?? undefined,
            activeOn: activeOnParam ?? undefined,
            includeInactive,
            page,
            limit: PAGE_LIMIT
        }),
        [propertyId, activeOnParam, includeInactive, page]
    );

    const propertiesQuery = useProperties({ page: 1, limit: 100 });
    const properties: Property[] = useMemo(() => propertiesQuery.data?.data ?? [], [propertiesQuery.data]);
    const propertiesById = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);

    const overridesQuery = useOverridesList(filters);
    const overrides = overridesQuery.data?.data ?? [];
    const total = overridesQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    const [searchName, setSearchName] = useState('');
    const visibleOverrides = useMemo(() => {
        const query = searchName.trim().toLowerCase();
        if (!query) return overrides;
        return overrides.filter(o => o.name.toLowerCase().includes(query));
    }, [overrides, searchName]);

    const createMutation = useCreateOverride();
    const updateMutation = useUpdateOverride();
    const deactivateMutation = useDeactivateOverride();

    const [formOpen, setFormOpen] = useState(false);
    const [editingOverride, setEditingOverride] = useState<PricingRule | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<PricingRule | null>(null);

    const updateParam = useCallback(
        (key: string, value: string | null) => {
            const next = new URLSearchParams(searchParams);
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
            next.set('overridesPage', '1');
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const handlePageChange = useCallback(
        (next: number) => {
            const params = new URLSearchParams(searchParams);
            params.set('overridesPage', String(next));
            setSearchParams(params, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const handleCreate = useCallback(() => {
        setEditingOverride(null);
        setFormOpen(true);
    }, []);

    const handleEdit = useCallback(
        (override: PricingRule) => {
            // Defence-in-depth: global rules are a read-only baseline for everyone
            // (the backend refuses the write too). The lock icon in the actions
            // column already hides this entry point, but guard here as well so any
            // future caller of handleEdit is safe.
            if (isManager && override.propertyId === null) return;
            setEditingOverride(override);
            setFormOpen(true);
        },
        [isManager]
    );

    const handleSubmit = (values: PricingRuleCreate) => {
        if (editingOverride) {
            const { propertyId: _omit, ...patch } = values;
            void _omit;
            updateMutation.mutate(
                { id: editingOverride.id, data: patch },
                {
                    onSuccess: () => {
                        notifications.show({ color: 'green', message: 'Override updated.' });
                        setFormOpen(false);
                        setEditingOverride(null);
                    },
                    onError: (err: unknown) => {
                        const message = (err as { message?: string })?.message ?? 'Failed to update override.';
                        notifications.show({ color: 'red', message });
                    }
                }
            );
        } else {
            createMutation.mutate(values, {
                onSuccess: () => {
                    notifications.show({ color: 'green', message: 'Override created.' });
                    setFormOpen(false);
                },
                onError: (err: unknown) => {
                    const message = (err as { message?: string })?.message ?? 'Failed to create override.';
                    notifications.show({ color: 'red', message });
                }
            });
        }
    };

    const handleDeactivate = useCallback((override: PricingRule) => {
        setConfirmTarget(override);
    }, []);

    const handleConfirmDeactivate = () => {
        if (!confirmTarget) return;
        deactivateMutation.mutate(confirmTarget.id, {
            onSuccess: () => {
                notifications.show({ color: 'green', message: 'Override deactivated.' });
                setConfirmTarget(null);
            },
            onError: (err: unknown) => {
                const message = (err as { message?: string })?.message ?? 'Failed to deactivate override.';
                notifications.show({ color: 'red', message });
            }
        });
    };

    const handleReactivate = useCallback(
        (override: PricingRule) => {
            updateMutation.mutate(
                { id: override.id, data: { isActive: true } },
                {
                    onSuccess: () => {
                        notifications.show({ color: 'green', message: 'Override reactivated.' });
                    },
                    onError: (err: unknown) => {
                        const message = (err as { message?: string })?.message ?? 'Failed to reactivate override.';
                        notifications.show({ color: 'red', message });
                    }
                }
            );
        },
        [updateMutation]
    );

    const columns: ColumnDef<PricingRule>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Name',
                render: row => <Text fw={500}>{row.name}</Text>
            },
            {
                key: 'scope',
                header: 'Scope',
                render: row => {
                    if (row.propertyId === null) {
                        return (
                            <Group gap={6} wrap='nowrap'>
                                <Badge color='yellow' variant='light'>
                                    Global
                                </Badge>
                                {isManager && (
                                    <Badge color='gray' variant='light' leftSection={<IconLock size={10} />}>
                                        Locked
                                    </Badge>
                                )}
                            </Group>
                        );
                    }
                    const property = propertiesById.get(row.propertyId);
                    return (
                        <Stack gap={0}>
                            <Text size='sm'>{property?.title ?? row.propertyId}</Text>
                            {property && (
                                <Text size='xs' c='dimmed'>
                                    {property.city}
                                </Text>
                            )}
                        </Stack>
                    );
                }
            },
            {
                key: 'type',
                header: 'Type',
                render: row => (
                    <Badge color={TYPE_BADGE_COLOR[row.type] ?? 'gray'} variant='light'>
                        {row.type}
                    </Badge>
                )
            },
            {
                key: 'minNights',
                header: 'Min nights',
                align: 'right',
                render: row =>
                    row.minNights != null ? (
                        <Text size='sm'>{row.minNights}</Text>
                    ) : (
                        <Text size='sm' c='dimmed'>
                            —
                        </Text>
                    )
            },
            {
                key: 'dates',
                header: 'Dates',
                render: row => (
                    <Text size='sm'>
                        {dayjs(row.startDate).format(DATE_FORMAT)} → {dayjs(row.endDate).format(DATE_FORMAT)}
                    </Text>
                )
            },
            {
                key: 'adjustment',
                header: 'Adjustment',
                align: 'right',
                render: row => (
                    <Group gap={6} justify='flex-end' wrap='nowrap'>
                        <Text c={percentColor(row.multiplier)} fw={500}>
                            {formatPercent(row.multiplier)}
                        </Text>
                        {isOutsideEngineCap(row.multiplier) && (
                            <Tooltip label='Outside engine cap [0.6, 1.8] — will be clamped at quote time'>
                                <IconAlertTriangle size={14} color='var(--mantine-color-yellow-7)' />
                            </Tooltip>
                        )}
                    </Group>
                )
            },
            {
                key: 'status',
                header: 'Status',
                render: row =>
                    row.isActive ? (
                        <Badge color='green' variant='light'>
                            Active
                        </Badge>
                    ) : (
                        <Badge color='gray' variant='light'>
                            Inactive
                        </Badge>
                    )
            },
            {
                key: 'actions',
                header: '',
                width: 60,
                align: 'right',
                render: row => {
                    if (isManager && row.propertyId === null) {
                        return (
                            <Tooltip label='Global rules are a fixed baseline and cannot be edited'>
                                <ActionIcon variant='subtle' disabled aria-label='Locked global rule'>
                                    <IconLock size={16} />
                                </ActionIcon>
                            </Tooltip>
                        );
                    }
                    return (
                        <Menu shadow='md' position='bottom-end'>
                            <Menu.Target>
                                <ActionIcon variant='subtle' aria-label='Actions'>
                                    <IconDotsVertical size={16} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => handleEdit(row)}>
                                    Edit
                                </Menu.Item>
                                {row.isActive ? (
                                    <Menu.Item
                                        color='red'
                                        leftSection={<IconPlayerPause size={14} />}
                                        onClick={() => handleDeactivate(row)}
                                    >
                                        Deactivate
                                    </Menu.Item>
                                ) : (
                                    <Menu.Item
                                        leftSection={<IconPlayerPlay size={14} />}
                                        onClick={() => handleReactivate(row)}
                                    >
                                        Reactivate
                                    </Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    );
                }
            }
        ],
        [propertiesById, handleEdit, handleDeactivate, handleReactivate, isManager]
    );

    const getRowAttributes = (row: PricingRule): RowDataAttributes => ({
        'data-inactive': row.isActive ? undefined : 'true'
    });

    const managerHasNoProperties = isManager && !propertiesQuery.isLoading && properties.length === 0;

    return (
        <Stack gap='md'>
            {managerHasNoProperties && (
                <Alert icon={<IconInfoCircle size={16} />} color='yellow' variant='light' title='No properties yet'>
                    You don't manage any properties yet, so there's nothing to override. Create one from the Properties
                    page, then return here to set per-property pricing rules.
                </Alert>
            )}

            <OverridesFilterBar
                properties={properties}
                propertyId={propertyId}
                activeOn={activeOnParam ? dayjs(activeOnParam).toDate() : null}
                includeInactive={includeInactive}
                searchName={searchName}
                canCreate={!managerHasNoProperties}
                createDisabledReason={
                    managerHasNoProperties ? 'Ask an admin to assign properties to you first.' : undefined
                }
                onChangePropertyId={value => updateParam('propertyId', value)}
                onChangeActiveOn={value => updateParam('activeOn', value ? dayjs(value).format('YYYY-MM-DD') : null)}
                onToggleIncludeInactive={value => updateParam('includeInactive', value ? 'true' : null)}
                onChangeSearchName={setSearchName}
                onCreate={handleCreate}
            />

            <DataTable
                data={visibleOverrides}
                columns={columns}
                isLoading={overridesQuery.isLoading}
                getRowKey={row => row.id}
                getRowAttributes={getRowAttributes}
                emptyState={
                    <EmptyState
                        variant='compact'
                        icon={IconCalendarOff}
                        title='No overrides yet'
                        body='Create a seasonal or demand override to adjust prices for a date range.'
                    />
                }
            />

            {totalPages > 1 && (
                <Center>
                    <Pagination value={page} onChange={handlePageChange} total={totalPages} />
                </Center>
            )}

            <OverrideFormModal
                opened={formOpen}
                override={editingOverride}
                properties={properties}
                isSaving={createMutation.isPending || updateMutation.isPending}
                isManager={isManager}
                onClose={() => {
                    setFormOpen(false);
                    setEditingOverride(null);
                }}
                onSubmit={handleSubmit}
            />

            <DeactivateConfirmModal
                opened={confirmTarget !== null}
                override={confirmTarget}
                isPending={deactivateMutation.isPending}
                onClose={() => setConfirmTarget(null)}
                onConfirm={handleConfirmDeactivate}
            />
        </Stack>
    );
}
