import { useState } from 'react';
import { Alert, Badge, Button, Card, Group, MultiSelect, Skeleton, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { CategoryRouting, ManagerSummary, TicketCategory } from '@staylark/contract';
import { useTicketRouting, useUpdateCategoryRouting } from '@/hooks/api/use-ticket-routing';
import { useManagers } from '@/hooks/api/use-managers';
import { useAuth } from '@/contexts/auth-context';
import { CategoryBadge } from '@/features/tickets/components/CategoryBadge';
import { CATEGORY_LABELS } from '@/features/tickets/utils/routing-labels';
import classes from './AdminTicketRoutingPage.module.css';

const CATEGORY_ORDER: TicketCategory[] = ['NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY'];

function sameSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    return a.every(id => setB.has(id));
}

interface CategoryRowProps {
    routing: CategoryRouting;
    managers: ManagerSummary[];
    /** Admins edit the whole set; managers may only add or remove themselves. */
    canEditAll: boolean;
    viewerId: string | undefined;
}

function CategoryRow({ routing, managers, canEditAll, viewerId }: CategoryRowProps) {
    const savedIds = routing.assignees.map(a => a.userId);
    const [selected, setSelected] = useState<string[]>(savedIds);
    const updateMutation = useUpdateCategoryRouting();

    const options = managers.map(m => ({ value: m.id, label: m.name }));
    const isDirty = !sameSet(selected, savedIds);
    const iHandleThis = viewerId ? savedIds.includes(viewerId) : false;

    const toggleSelf = () => {
        if (!viewerId) return;
        const next = iHandleThis ? savedIds.filter(id => id !== viewerId) : [...savedIds, viewerId];
        updateMutation.mutate(
            { category: routing.category, userIds: next },
            {
                onSuccess: () =>
                    notifications.show({
                        title: iHandleThis ? 'Removed from category' : 'Added to category',
                        message: iHandleThis
                            ? `You no longer handle ${CATEGORY_LABELS[routing.category]} tickets.`
                            : `You now handle ${CATEGORY_LABELS[routing.category]} tickets.`,
                        color: 'green'
                    }),
                onError: () =>
                    notifications.show({ title: 'Update failed', message: 'Please try again.', color: 'red' })
            }
        );
    };

    const handleSave = () => {
        updateMutation.mutate(
            { category: routing.category, userIds: selected },
            {
                onSuccess: () => {
                    notifications.show({
                        title: 'Routing updated',
                        message: `${CATEGORY_LABELS[routing.category]} handlers saved.`,
                        color: 'green'
                    });
                },
                onError: () => {
                    notifications.show({
                        title: 'Update failed',
                        message: `Could not save ${CATEGORY_LABELS[routing.category]} handlers.`,
                        color: 'red'
                    });
                }
            }
        );
    };

    // Managers see who handles the category but cannot change anyone else's entry.
    if (!canEditAll) {
        return (
            <Card withBorder radius='md' padding='lg'>
                <div className={classes.row}>
                    <div className={classes.label}>
                        <CategoryBadge category={routing.category} />
                    </div>
                    <Group gap='xs' className={classes.select}>
                        {routing.assignees.length === 0 ? (
                            <Text size='sm' c='dimmed'>
                                No specialist — goes to the property&apos;s manager
                            </Text>
                        ) : (
                            routing.assignees.map(a => (
                                <Badge
                                    key={a.userId}
                                    variant={a.userId === viewerId ? 'filled' : 'light'}
                                    color={a.userId === viewerId ? 'teal' : 'gray'}
                                >
                                    {a.userId === viewerId ? `${a.name} (you)` : a.name}
                                </Badge>
                            ))
                        )}
                    </Group>
                    <div className={classes.action}>
                        <Button
                            variant={iHandleThis ? 'default' : 'light'}
                            onClick={toggleSelf}
                            loading={updateMutation.isPending}
                        >
                            {iHandleThis ? 'Leave' : 'Handle this'}
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card withBorder radius='md' padding='lg'>
            <div className={classes.row}>
                <div className={classes.label}>
                    <CategoryBadge category={routing.category} />
                </div>
                <MultiSelect
                    className={classes.select}
                    data={options}
                    value={selected}
                    onChange={setSelected}
                    placeholder={selected.length === 0 ? 'No specialist — property manager handles it' : undefined}
                    searchable
                    clearable
                    aria-label={`${CATEGORY_LABELS[routing.category]} handlers`}
                    comboboxProps={{ withinPortal: true }}
                />
                <div className={classes.action}>
                    <Button onClick={handleSave} disabled={!isDirty} loading={updateMutation.isPending}>
                        Save
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export function AdminTicketRoutingPage() {
    const { user } = useAuth();
    const canEditAll = user?.role === 'ADMIN';
    const routingQuery = useTicketRouting();
    const managersQuery = useManagers();

    const isLoading = routingQuery.isLoading || managersQuery.isLoading;
    const isError = routingQuery.isError || managersQuery.isError;

    const routingByCategory = new Map((routingQuery.data ?? []).map(r => [r.category, r]));
    const managers = managersQuery.data ?? [];

    return (
        <Stack gap='lg'>
            <Stack gap={4}>
                <Title order={2}>Ticket Routing</Title>
                <Text size='sm' c='dimmed'>
                    {canEditAll
                        ? 'Choose which managers specialise in each ticket category. A new ticket goes to the property’s manager when they handle that category; otherwise to the best-placed specialist — same city first, then whoever has the fewest open tickets. With no specialist, it always falls to the property’s manager.'
                        : 'Who specialises in each ticket category. Tickets on your properties come to you for any category you handle. For the others, they go to the specialist below — so this is where to look when a ticket you expected went elsewhere. You can add or remove yourself; only an admin can change anyone else.'}
                </Text>
            </Stack>

            {isError && (
                <Alert color='red' icon={<IconAlertTriangle size={16} />} title='Failed to load routing'>
                    Something went wrong while loading the category routing. Please retry.
                </Alert>
            )}

            {isLoading && (
                <Stack gap='md'>
                    {CATEGORY_ORDER.map(category => (
                        <Skeleton key={category} height={92} radius='md' />
                    ))}
                </Stack>
            )}

            {!isLoading && !isError && (
                <Stack gap='md'>
                    {CATEGORY_ORDER.map(category => {
                        const routing = routingByCategory.get(category) ?? { category, assignees: [] };
                        // Re-key on the saved assignee set so the row reseeds its draft
                        // state whenever the server-side mapping changes underneath it.
                        const savedKey = routing.assignees
                            .map(a => a.userId)
                            .sort()
                            .join(',');
                        return (
                            <CategoryRow
                                key={`${category}:${savedKey}`}
                                routing={routing}
                                managers={managers}
                                canEditAll={canEditAll}
                                viewerId={user?.id}
                            />
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );
}
