import { useState, useCallback, useMemo } from 'react';
import { Popover, UnstyledButton } from '@mantine/core';
import { IconMicrophone, IconChevronRight } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/auth-context';
import { useEligibleFeedback } from '@/hooks/api/use-feedback';
import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import type { EligibleBooking } from '@staylark/contract';
import classes from './FeedbackChip.module.css';

export function FeedbackChip() {
    const { isAuthenticated, user } = useAuth();
    const isRegularUser = user?.role === 'USER';
    const location = useLocation();
    const navigate = useNavigate();

    const { data, refetch } = useEligibleFeedback(isAuthenticated && isRegularUser);

    const [popoverOpened, setPopoverOpened] = useState(false);
    const [modalOpened, setModalOpened] = useState(false);
    const [currentBooking, setCurrentBooking] = useState<EligibleBooking | null>(null);

    const eligibleBookings = useMemo(() => data?.eligibleBookings ?? [], [data]);
    const count = eligibleBookings.length;

    const handlePick = useCallback(
        (booking: EligibleBooking) => {
            setPopoverOpened(false);
            setCurrentBooking(booking);
            setModalOpened(true);

            if (location.pathname !== `/properties/${booking.propertyId}`) {
                navigate(`/properties/${booking.propertyId}`);
            }
        },
        [location.pathname, navigate]
    );

    const handleCloseModal = useCallback(() => {
        setModalOpened(false);
        setCurrentBooking(null);
    }, []);

    const handleFeedbackSubmitted = useCallback(() => {
        refetch();
    }, [refetch]);

    const label = `${count} ${count === 1 ? 'stay needs' : 'stays need'} your feedback`;

    return (
        <>
            {count > 0 && (
                <Popover
                    opened={popoverOpened}
                    onChange={setPopoverOpened}
                    position='bottom-end'
                    offset={14}
                    width={300}
                    shadow='md'
                    radius='lg'
                    withArrow
                    arrowPosition='side'
                    arrowOffset={22}
                >
                    <Popover.Target>
                        <UnstyledButton
                            className={classes.chip}
                            onClick={() => setPopoverOpened(o => !o)}
                            aria-label={label}
                            aria-haspopup='dialog'
                            aria-expanded={popoverOpened}
                        >
                            <span className={classes.count}>{count}</span>
                            <span className={classes.label}>Feedback due</span>
                        </UnstyledButton>
                    </Popover.Target>
                    <Popover.Dropdown className={classes.dropdown}>
                        <p className={classes.heading}>{label}</p>
                        <p className={classes.hint}>Record a voice note and AI writes it up.</p>
                        <ul className={classes.list}>
                            {eligibleBookings.map(booking => (
                                <li key={booking.bookingId}>
                                    <UnstyledButton className={classes.row} onClick={() => handlePick(booking)}>
                                        <span className={classes.mic} aria-hidden='true'>
                                            <IconMicrophone size={16} stroke={1.8} />
                                        </span>
                                        <span className={classes.stay}>
                                            <span className={classes.name}>{booking.propertyName}</span>
                                            <span className={classes.meta}>
                                                {booking.propertyCity}, checked out{' '}
                                                {dayjs(booking.checkOutDate).format('D MMM')}
                                            </span>
                                        </span>
                                        <IconChevronRight size={16} stroke={1.8} className={classes.chevron} />
                                    </UnstyledButton>
                                </li>
                            ))}
                        </ul>
                    </Popover.Dropdown>
                </Popover>
            )}

            <FeedbackModal
                key={currentBooking?.bookingId}
                opened={modalOpened}
                onClose={handleCloseModal}
                booking={currentBooking}
                onFeedbackSubmitted={handleFeedbackSubmitted}
            />
        </>
    );
}
