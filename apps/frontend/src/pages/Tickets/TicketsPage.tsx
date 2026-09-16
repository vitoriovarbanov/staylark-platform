import { useState } from 'react';
import { Container, Stack, Text, Skeleton, Alert, Anchor, Group, Button } from '@mantine/core';
import { IconAlertTriangle, IconAlertOctagon } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router';
import { useTickets } from '@/hooks/api/use-tickets';
import { useBookings } from '@/hooks/api/use-bookings';
import { TicketDetailModal } from '@/features/tickets/TicketDetailModal';
import { ReportProblemModal, type ReportableBooking } from '@/features/tickets/ReportProblemModal';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { TicketCard } from './components/TicketCard';

export function TicketsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    // Reply-notification emails deep-link here as /tickets?ticket=<id>, so the
    // thread opens straight from the inbox rather than dropping the guest on a list.
    const [activeTicketId, setActiveTicketId] = useState<string | null>(() => searchParams.get('ticket'));
    const [reportModalOpened, setReportModalOpened] = useState(false);

    const closeTicket = () => {
        setActiveTicketId(null);
        // Drop the param too, or a refresh/back would reopen the modal.
        if (searchParams.has('ticket')) {
            const next = new URLSearchParams(searchParams);
            next.delete('ticket');
            setSearchParams(next, { replace: true });
        }
    };

    const ticketsQuery = useTickets({ page: 1, limit: 50 });
    // Bookings used to enrich the cards with property name/photo/city, and to
    // resolve the current active stay the header "Report a problem" CTA targets.
    const bookingsQuery = useBookings({ page: 1, limit: 50 });

    const tickets = ticketsQuery.data?.data.tickets ?? [];
    const bookings = bookingsQuery.data?.data ?? [];
    const bookingsByPropertyId = new Map<string, { name: string; city: string; photo: string | null }>();
    for (const b of bookings) {
        bookingsByPropertyId.set(b.property.id, {
            name: b.property.title,
            city: b.property.city,
            photo: b.property.photos[0] ?? null
        });
    }

    // Auto-target the active stay ending soonest, mirroring the bookings hero.
    const activeBooking =
        bookings.filter(b => b.status === 'ACTIVE').sort((a, b) => a.checkOut.localeCompare(b.checkOut))[0] ?? null;

    const reportableBooking: ReportableBooking | null = activeBooking
        ? {
              bookingId: activeBooking.id,
              propertyId: activeBooking.property.id,
              propertyName: activeBooking.property.title,
              propertyCity: activeBooking.property.city,
              checkIn: activeBooking.checkIn,
              checkOut: activeBooking.checkOut
          }
        : null;

    return (
        <Container size='xl' py='lg'>
            <Stack gap='lg'>
                <PageHeader
                    title='My Reports'
                    subtitle="Problems you've reported during your stays — track status and resolution."
                    actions={
                        activeBooking && (
                            <Button
                                leftSection={<IconAlertOctagon size={16} />}
                                onClick={() => setReportModalOpened(true)}
                            >
                                Report a problem
                            </Button>
                        )
                    }
                />

                {ticketsQuery.isLoading && (
                    <Stack gap='md'>
                        <Skeleton height={140} radius='md' />
                        <Skeleton height={140} radius='md' />
                        <Skeleton height={140} radius='md' />
                    </Stack>
                )}

                {ticketsQuery.isError && (
                    <Alert icon={<IconAlertTriangle size={18} />} color='red' title='Failed to load reports'>
                        <Group justify='space-between'>
                            <Text size='sm'>Something went wrong while loading your reports.</Text>
                            <Anchor onClick={() => ticketsQuery.refetch()} size='sm'>
                                Retry
                            </Anchor>
                        </Group>
                    </Alert>
                )}

                {ticketsQuery.isSuccess && tickets.length === 0 && (
                    <EmptyState
                        eyebrow='NO REPORTS FILED'
                        title='Your stays have been smooth sailing.'
                        body={
                            <>
                                Need to flag something during an active stay?{' '}
                                <Anchor component={Link} to='/bookings' c='amber.4' inherit>
                                    Open My Bookings
                                </Anchor>{' '}
                                and tap "Report a problem" on the active booking.
                            </>
                        }
                    />
                )}

                {ticketsQuery.isSuccess && tickets.length > 0 && (
                    <Stack gap='md'>
                        {tickets.map(ticket => {
                            const meta = bookingsByPropertyId.get(ticket.propertyId);
                            return (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    propertyName={meta?.name}
                                    propertyCity={meta?.city}
                                    propertyPhoto={meta?.photo}
                                    onClick={() => setActiveTicketId(ticket.id)}
                                />
                            );
                        })}
                    </Stack>
                )}
            </Stack>

            <TicketDetailModal opened={!!activeTicketId} onClose={closeTicket} ticketId={activeTicketId} />

            <ReportProblemModal
                opened={reportModalOpened}
                onClose={() => setReportModalOpened(false)}
                booking={reportableBooking}
            />
        </Container>
    );
}
