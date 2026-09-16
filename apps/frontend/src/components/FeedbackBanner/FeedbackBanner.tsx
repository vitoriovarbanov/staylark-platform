import { useState, useCallback, useMemo } from 'react';
import { IconArrowRight, IconX } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/auth-context';
import { useEligibleFeedback } from '@/hooks/api/use-feedback';
import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import type { EligibleBooking } from '@staylark/contract';
import classes from './FeedbackBanner.module.css';

export function FeedbackBanner() {
    const { isAuthenticated, user } = useAuth();
    const isRegularUser = user?.role === 'USER';
    const location = useLocation();
    const navigate = useNavigate();

    const { data, refetch } = useEligibleFeedback(isAuthenticated && isRegularUser);

    const [dismissed, setDismissed] = useState(false);
    const [modalOpened, setModalOpened] = useState(false);
    const [currentBooking, setCurrentBooking] = useState<EligibleBooking | null>(null);

    const eligibleBookings = useMemo(() => data?.eligibleBookings ?? [], [data]);
    const count = eligibleBookings.length;

    const handleLeaveFeedback = useCallback(() => {
        if (eligibleBookings.length === 0) return;

        const booking = eligibleBookings[0];
        setCurrentBooking(booking);
        setModalOpened(true);

        if (location.pathname !== `/properties/${booking.propertyId}`) {
            navigate(`/properties/${booking.propertyId}`);
        }
    }, [eligibleBookings, location.pathname, navigate]);

    const handleCloseDrawer = useCallback(() => {
        setModalOpened(false);
        setCurrentBooking(null);
    }, []);

    const handleFeedbackSubmitted = useCallback(() => {
        refetch();
    }, [refetch]);

    const handleDismiss = useCallback(() => {
        setDismissed(true);
    }, []);

    if (!isAuthenticated || !isRegularUser || count === 0) {
        if (modalOpened) {
            return (
                <FeedbackModal
                    key={currentBooking?.bookingId}
                    opened={modalOpened}
                    onClose={handleCloseDrawer}
                    booking={currentBooking}
                    onFeedbackSubmitted={handleFeedbackSubmitted}
                />
            );
        }
        return null;
    }

    if (dismissed) {
        return null;
    }

    return (
        <>
            <div className={classes.banner} role='status' aria-live='polite'>
                <span className={classes.spine} aria-hidden='true' />
                <div className={classes.body}>
                    <span className={classes.dot} aria-hidden='true' />
                    <div className={classes.text}>
                        <span className={classes.eyebrow}>Awaiting your voice</span>
                        <span className={classes.message}>
                            <strong>{count}</strong> {count === 1 ? 'stay needs' : 'stays need'} your feedback
                            <span className={classes.messageTail}> — transcribed by AI in seconds.</span>
                        </span>
                    </div>
                </div>
                <div className={classes.actions}>
                    <button
                        type='button'
                        className={classes.cta}
                        onClick={handleLeaveFeedback}
                        aria-label='Leave feedback now'
                    >
                        Leave feedback
                        <IconArrowRight size={13} stroke={2.4} />
                    </button>
                    <button
                        type='button'
                        className={classes.dismiss}
                        onClick={handleDismiss}
                        aria-label='Dismiss this banner'
                    >
                        <IconX size={14} stroke={2} />
                    </button>
                </div>
            </div>

            <FeedbackModal
                key={currentBooking?.bookingId}
                opened={modalOpened}
                onClose={handleCloseDrawer}
                booking={currentBooking}
                onFeedbackSubmitted={handleFeedbackSubmitted}
            />
        </>
    );
}
