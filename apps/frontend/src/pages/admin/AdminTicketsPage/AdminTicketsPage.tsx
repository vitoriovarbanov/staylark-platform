import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Stack, Text, Title, Pagination, Center, Alert, Button, Group } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { Ticket, TicketCategory, TicketPriority, TicketSortField, TicketStatus } from '@staylark/contract';
import { useTickets } from '@/hooks/api/use-tickets';
import { useProperties } from '@/hooks/api/use-properties';
import { useManagers } from '@/hooks/api/use-managers';
import { useAuth } from '@/contexts/auth-context';
import { TicketDetailModal } from '@/features/tickets/TicketDetailModal';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { CardGrid } from '@/components/CardGrid/CardGrid';
import { TicketsFilterBar } from './components/TicketsFilterBar';
import { TicketCard } from './components/TicketCard';
import { EmptyTicketsState } from './components/EmptyTicketsState';

const PAGE_SIZE = 20;

export function AdminTicketsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    // Ticket emails deep-link here as /admin/tickets?ticket=<id>.
    const [activeTicketId, setActiveTicketId] = useState<string | null>(() => searchParams.get('ticket'));
    const { user } = useAuth();

    const status = (searchParams.get('status') as TicketStatus | null) || null;
    const priority = (searchParams.get('priority') as TicketPriority | null) || null;
    const category = (searchParams.get('category') as TicketCategory | null) || null;
    const propertyId = searchParams.get('propertyId') || null;
    const needsAssignment = searchParams.get('needsAssignment') === 'true';
    const assignedToId = searchParams.get('assignedToId') || null;
    const sortBy = (searchParams.get('sortBy') as TicketSortField | null) || null;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc' | null) || 'desc';
    const page = Number(searchParams.get('page') || '1');

    const ticketsQuery = useTickets({
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
        ...(propertyId && { propertyId }),
        ...(needsAssignment && { needsAssignment: true }),
        ...(assignedToId && { assignedToId }),
        ...(sortBy && { sortBy, sortOrder }),
        page,
        limit: PAGE_SIZE
    });
    const propertiesQuery = useProperties({ page: 1, limit: 100 });

    // Assignee filter options come from the ADMIN-only managers endpoint (403s for
    // non-admins), so the query is gated on role and managers get an empty list.
    // The manager roster is manager-accessible now: it feeds the assignee filter
    // here and the reassign picker in the ticket modal.
    const managersQuery = useManagers(true);
    const assigneeOptions = (managersQuery.data ?? []).map(m => ({ value: m.id, label: m.name }));

    // "Assigned to me" — a pinned section above the main list so staff can separate
    // their own work from the triage pool. assignedToId is always set here (admin route
    // guarantees a user), so this never degrades to an unscoped fetch.
    const myTicketsQuery = useTickets(user?.id ? { assignedToId: user.id, limit: 100 } : { limit: 1 });
    const myTickets = user?.id ? (myTicketsQuery.data?.data.tickets ?? []) : [];
    const myTicketsTotal = myTicketsQuery.data?.data.total ?? myTickets.length;

    // Count of CRITICAL tickets that are still OPEN — drives the top alert banner.
    // Hidden when the user is already filtering by priority=CRITICAL.
    const criticalOpenQuery = useTickets({ priority: 'CRITICAL', status: 'OPEN', page: 1, limit: 1 });
    const criticalOpenCount = criticalOpenQuery.data?.data.total ?? 0;
    const showCriticalBanner = criticalOpenCount > 0 && priority !== 'CRITICAL';

    const tickets = ticketsQuery.data?.data.tickets ?? [];
    const totalPages = ticketsQuery.data?.data.totalPages ?? 0;
    const properties = propertiesQuery.data?.data ?? [];

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

    // Not updateParams: that also clears `page`, which would reset pagination
    // just because a ticket modal was dismissed.
    const closeTicket = useCallback(() => {
        setActiveTicketId(null);
        setSearchParams(
            prev => {
                prev.delete('ticket');
                return prev;
            },
            { replace: true }
        );
    }, [setSearchParams]);

    const handleFilterChange = useCallback(
        (
            patch: Partial<{
                status: TicketStatus | null;
                priority: TicketPriority | null;
                category: TicketCategory | null;
                propertyId: string | null;
                needsAssignment: boolean;
                assignedToId: string | null;
            }>
        ) => {
            const { needsAssignment: nextNeedsAssignment, ...rest } = patch;
            const normalized: Record<string, string | null> = { ...(rest as Record<string, string | null>) };
            // Only ever persist the literal 'true'; omit the param entirely when off.
            if (nextNeedsAssignment !== undefined) {
                normalized.needsAssignment = nextNeedsAssignment ? 'true' : null;
            }
            updateParams(normalized);
        },
        [updateParams]
    );

    const handleSortChange = useCallback(
        (nextSortBy: string | null, nextSortOrder: 'asc' | 'desc') => {
            updateParams({ sortBy: nextSortBy, sortOrder: nextSortBy ? nextSortOrder : null });
        },
        [updateParams]
    );

    const handleClear = useCallback(() => {
        setSearchParams(prev => {
            prev.delete('status');
            prev.delete('priority');
            prev.delete('category');
            prev.delete('propertyId');
            prev.delete('needsAssignment');
            prev.delete('assignedToId');
            prev.delete('sortBy');
            prev.delete('sortOrder');
            prev.delete('page');
            return prev;
        });
    }, [setSearchParams]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            setSearchParams(prev => {
                prev.set('page', String(newPage));
                return prev;
            });
        },
        [setSearchParams]
    );

    const hasFilters = !!(status || priority || category || propertyId || needsAssignment || assignedToId);

    return (
        <Stack gap='lg'>
            <PageHeader
                title='Tickets'
                subtitle='Problems reported from active stays — triage by priority, route, and resolve.'
            />

            {showCriticalBanner && (
                <Alert
                    icon={<IconAlertTriangle size={18} />}
                    color='red'
                    title={`${criticalOpenCount} critical ticket${criticalOpenCount > 1 ? 's' : ''} need${criticalOpenCount > 1 ? '' : 's'} triage`}
                >
                    <Group justify='space-between' wrap='nowrap'>
                        <Text size='sm'>Open and flagged as critical priority — review these first.</Text>
                        <Button
                            size='xs'
                            color='red'
                            variant='filled'
                            onClick={() => handleFilterChange({ priority: 'CRITICAL' })}
                        >
                            Show critical only
                        </Button>
                    </Group>
                </Alert>
            )}

            {myTickets.length > 0 && (
                <Stack gap='sm'>
                    <Title order={5}>Assigned to me ({myTicketsTotal})</Title>
                    <CardGrid<Ticket>
                        data={myTickets}
                        isLoading={myTicketsQuery.isLoading}
                        getCardKey={t => t.id}
                        onCardClick={t => setActiveTicketId(t.id)}
                        renderCard={t => <TicketCard ticket={t} />}
                    />
                </Stack>
            )}

            {myTickets.length > 0 && (
                <Title order={5} mt='xs'>
                    All tickets
                </Title>
            )}

            <TicketsFilterBar
                status={status}
                priority={priority}
                category={category}
                propertyId={propertyId}
                needsAssignment={needsAssignment}
                properties={properties}
                assignedToId={assignedToId}
                assignees={assigneeOptions}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                onChange={handleFilterChange}
                onClear={handleClear}
            />

            {ticketsQuery.isError && (
                <Alert icon={<IconAlertTriangle size={18} />} color='red' title='Failed to load tickets'>
                    Something went wrong while loading tickets. Please retry.
                </Alert>
            )}

            {!ticketsQuery.isLoading && tickets.length === 0 && !ticketsQuery.isError && (
                <EmptyTicketsState hasFilters={hasFilters} />
            )}

            {(ticketsQuery.isLoading || tickets.length > 0) && (
                <CardGrid<Ticket>
                    data={tickets}
                    isLoading={ticketsQuery.isLoading}
                    getCardKey={t => t.id}
                    onCardClick={t => setActiveTicketId(t.id)}
                    renderCard={t => <TicketCard ticket={t} />}
                />
            )}

            {totalPages > 1 && (
                <Center>
                    <Pagination value={page} onChange={handlePageChange} total={totalPages} size='sm' />
                </Center>
            )}

            <TicketDetailModal opened={!!activeTicketId} onClose={closeTicket} ticketId={activeTicketId} />
        </Stack>
    );
}
