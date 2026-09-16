import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { Anchor, Button, Group, Image, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEye, IconMicrophone, IconX, IconAlertOctagon } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { EligibleBooking } from '@staylark/contract';
import { useCancelBooking, type BookingWithRelations } from '@/hooks/api/use-bookings';
import { useFeedbackByBooking } from '@/hooks/api/use-feedback';
import { feedbackKeys } from '@/hooks/api/query-keys';
import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { ReportProblemModal } from '@/features/tickets/ReportProblemModal';
import type { ReportableBooking } from '@/features/tickets/ReportProblemModal';
import { StatusPill } from '@/components/StatusPill/StatusPill';
import classes from './BookingTicket.module.css';

interface BookingTicketProps {
    booking: BookingWithRelations;
    index?: number;
}

export function BookingTicket({ booking, index = 0 }: BookingTicketProps) {
    const cancelMutation = useCancelBooking();
    const queryClient = useQueryClient();
    const [modalOpened, setModalOpened] = useState(false);
    const [reportModalOpened, setReportModalOpened] = useState(false);

    const nights = dayjs(booking.checkOut).diff(dayjs(booking.checkIn), 'day');
    const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
    const showFeedbackAction = booking.status === 'ACTIVE' || booking.status === 'COMPLETED';
    const showReportAction = booking.status === 'ACTIVE';
    const isCancelled = booking.status === 'CANCELLED';

    const reportableBooking: ReportableBooking | null = showReportAction
        ? {
              bookingId: booking.id,
              propertyId: booking.property.id,
              propertyName: booking.property.title,
              propertyCity: booking.property.city,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut
          }
        : null;

    const { data: feedbackData } = useFeedbackByBooking(booking.id, showFeedbackAction);
    const existingFeedback = feedbackData?.data ?? null;
    const hasFeedback = !!existingFeedback;

    const eligibleBooking: EligibleBooking | null = showFeedbackAction
        ? {
              bookingId: booking.id,
              propertyId: booking.property.id,
              propertyName: booking.property.title,
              propertyCity: booking.property.city,
              checkOutDate: booking.checkOut
          }
        : null;

    const handleFeedbackSubmitted = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: feedbackKeys.byBooking(booking.id) });
    }, [queryClient, booking.id]);

    const handleCancel = () => {
        modals.openConfirmModal({
            title: 'Cancel Booking',
            children: (
                <Text size='sm'>
                    Are you sure you want to cancel your booking at {booking.property.title}? This cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Cancel Booking', cancel: 'Keep Booking' },
            confirmProps: { color: 'red' },
            onConfirm: () =>
                cancelMutation.mutate(booking.id, {
                    onSuccess: () =>
                        notifications.show({
                            title: 'Booking cancelled',
                            message: 'The booking has been cancelled.',
                            color: 'orange'
                        })
                })
        });
    };

    const photo = booking.property.photos[0];
    const dateRangeText = `${dayjs(booking.checkIn).format('D MMM').toUpperCase()} — ${dayjs(booking.checkOut)
        .format('D MMM YYYY')
        .toUpperCase()}`;

    return (
        <>
            <article className={classes.ticket} style={{ animationDelay: `${index * 0.08 + 0.1}s` }}>
                <div className={classes.photo}>
                    {photo ? (
                        <Image src={photo} alt={booking.property.title} className={classes.photoImg} />
                    ) : (
                        <div className={classes.photoFallback} />
                    )}
                    <div className={classes.photoOverlay} />
                    <span className={classes.photoCity}>{booking.property.city}</span>
                </div>

                <div className={classes.divider} aria-hidden='true' />

                <Stack gap='sm' p='lg' className={classes.content}>
                    <StatusPill status={booking.status} checkIn={booking.checkIn} checkOut={booking.checkOut} />

                    <Text className={classes.dateRow} data-cancelled={isCancelled || undefined}>
                        {dateRangeText}
                    </Text>

                    <Text className={classes.title} lineClamp={2}>
                        {booking.property.title}
                    </Text>

                    <Group gap='xs'>
                        <Text size='sm' c='dimmed'>
                            {nights} night{nights > 1 ? 's' : ''}
                        </Text>
                        <Text size='sm' c='dimmed' opacity={0.5}>
                            ·
                        </Text>
                        <Text size='sm' c='dimmed'>
                            {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                        </Text>
                    </Group>

                    <Group justify='space-between' align='flex-end' mt='auto' wrap='wrap' gap='xs'>
                        <span className={classes.price}>&euro;{booking.totalPrice}</span>
                        <Group gap='xs'>
                            {showReportAction && (
                                <Button
                                    variant='light'
                                    color='red'
                                    size='xs'
                                    leftSection={<IconAlertOctagon size={14} />}
                                    onClick={() => setReportModalOpened(true)}
                                >
                                    Report a problem
                                </Button>
                            )}
                            {showFeedbackAction && (
                                <Button
                                    variant='light'
                                    size='xs'
                                    color={hasFeedback ? 'gray' : undefined}
                                    leftSection={hasFeedback ? <IconEye size={14} /> : <IconMicrophone size={14} />}
                                    onClick={() => setModalOpened(true)}
                                >
                                    {hasFeedback ? 'View feedback' : 'Leave feedback'}
                                </Button>
                            )}
                            {canCancel && (
                                <Button
                                    variant='subtle'
                                    color='red'
                                    size='xs'
                                    leftSection={<IconX size={14} />}
                                    onClick={handleCancel}
                                    loading={cancelMutation.isPending}
                                >
                                    Cancel
                                </Button>
                            )}
                        </Group>
                    </Group>

                    {booking.status === 'CONFIRMED' && (
                        <Text className={classes.hint}>Free cancellation up to 48h before check-in</Text>
                    )}

                    {isCancelled && booking.cancellationReason === 'AUTO_EXPIRED_NO_CONFIRMATION' && (
                        <Text className={classes.hint} data-cancelled>
                            Not confirmed in time.{' '}
                            <Anchor component={Link} to={`/properties/${booking.property.id}`} inherit>
                                Book this property again
                            </Anchor>
                            .
                        </Text>
                    )}
                </Stack>
            </article>

            <FeedbackModal
                key={eligibleBooking?.bookingId}
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                booking={eligibleBooking}
                existingFeedback={existingFeedback}
                onFeedbackSubmitted={handleFeedbackSubmitted}
            />

            <ReportProblemModal
                opened={reportModalOpened}
                onClose={() => setReportModalOpened(false)}
                booking={reportableBooking}
            />
        </>
    );
}
