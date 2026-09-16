import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { ReportProblemModal, type ReportableBooking } from '@/features/tickets/ReportProblemModal';
import { feedbackKeys } from '@/hooks/api/query-keys';
import type { BookingWithRelations } from '@/hooks/api/use-bookings';
import { useFeedbackByBooking } from '@/hooks/api/use-feedback';
import { Button, Stack } from '@mantine/core';
import type { BookingStatus, EligibleBooking } from '@staylark/contract';
import { IconAlertOctagon, IconArrowRight } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { prefersReducedMotion, staggered } from '../../utils/bookings.utils';
import classes from './NextDepartureHero.module.css';
import { EmptyHero, StatusRibbon } from './components/NextDepartureComponents';
interface NextDepartureHeroProps {
    booking: BookingWithRelations | null;
}

const LABELS: Record<BookingStatus, string> = {
    ACTIVE: 'Currently staying',
    CONFIRMED: 'Next trip',
    PENDING: 'Awaiting confirmation',
    COMPLETED: 'Last journey',
    CANCELLED: ''
};

export function HeroForBooking({ booking }: { booking: BookingWithRelations }) {
    const reduced = prefersReducedMotion();
    const queryClient = useQueryClient();
    const [modalOpened, setModalOpened] = useState(false);
    const [reportModalOpened, setReportModalOpened] = useState(false);

    const isActive = booking.status === 'ACTIVE';
    const isFeedbackEligible = booking.status === 'ACTIVE' || booking.status === 'COMPLETED';
    const { data: feedbackData } = useFeedbackByBooking(booking.id, isFeedbackEligible);
    const existingFeedback = feedbackData?.data ?? null;
    const hasFeedback = !!existingFeedback;

    const eligibleBooking: EligibleBooking | null = isFeedbackEligible
        ? {
              bookingId: booking.id,
              propertyId: booking.property.id,
              propertyName: booking.property.title,
              propertyCity: booking.property.city,
              checkOutDate: booking.checkOut
          }
        : null;

    const reportableBooking: ReportableBooking | null = isActive
        ? {
              bookingId: booking.id,
              propertyId: booking.property.id,
              propertyName: booking.property.title,
              propertyCity: booking.property.city,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut
          }
        : null;

    const handleFeedbackSubmitted = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: feedbackKeys.byBooking(booking.id) });
    }, [queryClient, booking.id]);

    const photo = booking.property.photos[0];
    const label = LABELS[booking.status];
    const checkIn = dayjs(booking.checkIn);
    const checkOut = dayjs(booking.checkOut);
    const nights = checkOut.diff(checkIn, 'day');

    const isCompleted = booking.status === 'COMPLETED';
    const useFeedbackCta = isCompleted;
    const ctaLabel = useFeedbackCta ? (hasFeedback ? 'View feedback' : 'Leave feedback') : 'View property';

    return (
        <>
            <motion.div
                className={classes.hero}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={staggered(0, reduced)}
            >
                {photo ? (
                    <img src={photo} alt='' aria-hidden='true' className={classes.photo} />
                ) : (
                    <div className={classes.photoFallback} aria-hidden='true' />
                )}
                <div className={classes.photoOverlay} aria-hidden='true' />

                <div className={classes.content}>
                    <motion.div
                        className={classes.label}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={staggered(0.1, reduced)}
                    >
                        <span
                            className={`${classes.labelDot} ${booking.status === 'PENDING' ? classes.labelDotPulsing : ''}`}
                            aria-hidden='true'
                        />
                        {label}
                    </motion.div>

                    <motion.h2
                        className={classes.city}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={staggered(0.18, reduced)}
                    >
                        {booking.property.city}
                    </motion.h2>

                    <motion.div
                        className={classes.title}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={staggered(0.26, reduced)}
                    >
                        {booking.property.title}
                    </motion.div>

                    <motion.div
                        className={classes.statusRibbon}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={staggered(0.42, reduced)}
                    >
                        <StatusRibbon booking={booking} reduced={reduced} />
                    </motion.div>
                </div>

                <motion.div
                    className={classes.stub}
                    initial={reduced ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={staggered(0.34, reduced)}
                >
                    <div className={classes.stubDates}>
                        <span>{checkIn.format('D MMM').toUpperCase()}</span>
                        <span className={classes.stubDatesDash}></span>
                        <span>{checkOut.format('D MMM YYYY').toUpperCase()}</span>
                    </div>

                    <div className={classes.stubMeta}>
                        {nights} nights · {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                    </div>

                    <div>
                        <span className={classes.stubPriceLabel}>Total</span>
                        <span className={classes.stubPrice}>&euro;{booking.totalPrice}</span>
                    </div>

                    <div className={classes.stubCta}>
                        <Stack gap='sm'>
                            {useFeedbackCta ? (
                                <Button
                                    fullWidth
                                    variant='filled'
                                    color='brand.5'
                                    rightSection={<IconArrowRight size={16} />}
                                    onClick={() => setModalOpened(true)}
                                >
                                    {ctaLabel}
                                </Button>
                            ) : (
                                <Button
                                    fullWidth
                                    component={Link}
                                    to={`/properties/${booking.property.id}`}
                                    variant='filled'
                                    color='brand.5'
                                    rightSection={<IconArrowRight size={16} />}
                                >
                                    {ctaLabel}
                                </Button>
                            )}

                            {isActive && (
                                <Button
                                    fullWidth
                                    variant='white'
                                    color='red'
                                    leftSection={<IconAlertOctagon size={16} />}
                                    onClick={() => setReportModalOpened(true)}
                                >
                                    Report a problem
                                </Button>
                            )}
                        </Stack>
                    </div>
                </motion.div>
            </motion.div>

            {isFeedbackEligible && (
                <FeedbackModal
                    key={eligibleBooking?.bookingId}
                    opened={modalOpened}
                    onClose={() => setModalOpened(false)}
                    booking={eligibleBooking}
                    existingFeedback={existingFeedback}
                    onFeedbackSubmitted={handleFeedbackSubmitted}
                />
            )}

            {isActive && (
                <ReportProblemModal
                    opened={reportModalOpened}
                    onClose={() => setReportModalOpened(false)}
                    booking={reportableBooking}
                />
            )}
        </>
    );
}

export function NextDepartureHero({ booking }: NextDepartureHeroProps) {
    if (!booking) return <EmptyHero />;

    return <HeroForBooking booking={booking} />;
}
