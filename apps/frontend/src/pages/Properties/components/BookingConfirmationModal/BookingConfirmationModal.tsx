import { useState } from 'react';
import { Modal, Stack, Group, Text, Image, Divider, Button, Alert, Box, Skeleton } from '@mantine/core';
import { IconCheck, IconAlertCircle, IconArrowsExchange } from '@tabler/icons-react';
import { DurationDiscountSummary } from '@/components/DurationDiscountSummary/DurationDiscountSummary';
import type { BookingMode } from '@/lib/duration-label';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import type { CreateBooking, PricingResponse, PriceDriftDetails } from '@staylark/contract';
import { useCreateBooking } from '@/hooks/api/use-bookings';
import classes from './BookingConfirmationModal.module.css';

interface BookingConfirmationModalProps {
    opened: boolean;
    onClose: () => void;
    propertyTitle: string;
    propertyPhoto?: string;
    nightlyPrice: number;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    propertyId: string;
    quote: PricingResponse | undefined;
    isQuoteLoading: boolean;
    isQuoteError: boolean;
    mode: BookingMode;
}

type Status = 'summary' | 'success' | 'conflict' | 'drift' | 'error';

export function BookingConfirmationModal({
    opened,
    onClose,
    propertyTitle,
    propertyPhoto,
    nightlyPrice,
    checkIn,
    checkOut,
    nights,
    guests,
    propertyId,
    quote,
    isQuoteLoading,
    isQuoteError,
    mode
}: BookingConfirmationModalProps) {
    const [status, setStatus] = useState<Status>('summary');
    const [errorMessage, setErrorMessage] = useState('');
    const [drift, setDrift] = useState<PriceDriftDetails | null>(null);
    const createBooking = useCreateBooking();
    const navigate = useNavigate();

    // Only trust the quote when the latest fetch was successful. A stale `quote` paired with
    // `isQuoteError` means a refetch failed — skip `expectedTotalPrice` and let the server set truth.
    const useDynamic = !!quote && !isQuoteError;
    const displayTotal = useDynamic ? quote.totalPrice : nightlyPrice * nights;
    const displayAvg = useDynamic ? quote.dynamicPrice : nightlyPrice;
    // Block confirm until quote resolves OR endpoint fails. Failure path proceeds without expectedTotalPrice.
    const confirmDisabled = isQuoteLoading;
    const showFallbackNotice = !isQuoteLoading && !useDynamic;

    const submit = async (expectedTotalPrice?: number) => {
        const payload: CreateBooking = {
            propertyId,
            checkIn,
            checkOut,
            guests,
            ...(expectedTotalPrice !== undefined && { expectedTotalPrice })
        };
        try {
            await createBooking.mutateAsync(payload);
            setStatus('success');
        } catch (err: unknown) {
            const error = err as {
                status?: number;
                message?: string;
                errorCode?: string;
                details?: unknown;
            };
            if (error.status === 409 && error.errorCode === 'PRICE_DRIFT') {
                setDrift(error.details as PriceDriftDetails);
                setStatus('drift');
            } else if (error.status === 409) {
                setStatus('conflict');
            } else {
                setErrorMessage(error.message || 'Something went wrong. Please try again.');
                setStatus('error');
            }
        }
    };

    const handleConfirm = () => submit(useDynamic ? quote.totalPrice : undefined);
    const handleConfirmAtNewPrice = () => {
        if (!drift) return;
        submit(drift.newTotal);
    };

    const handleClose = () => {
        setStatus('summary');
        setErrorMessage('');
        setDrift(null);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            size='md'
            centered
            className={classes.modal}
            withCloseButton={false}
        >
            {status === 'summary' && (
                <Stack gap='md'>
                    <Text fw={700} size='lg'>
                        Confirm Booking
                    </Text>

                    <Group gap='md' align='center' wrap='nowrap'>
                        {propertyPhoto && (
                            <Image src={propertyPhoto} className={classes.propertyPhoto} alt={propertyTitle} />
                        )}
                        <Text fw={700} size='md'>
                            {propertyTitle}
                        </Text>
                    </Group>

                    <Divider />

                    <Box className={classes.detailsCard}>
                        <Stack gap='xs'>
                            <div className={classes.detailRow}>
                                <Text size='sm' c='dimmed'>
                                    Check-in
                                </Text>
                                <Text size='sm' fw={500}>
                                    {dayjs(checkIn).format('MMM D, YYYY')}
                                </Text>
                            </div>
                            <div className={classes.detailRow}>
                                <Text size='sm' c='dimmed'>
                                    Check-out
                                </Text>
                                <Text size='sm' fw={500}>
                                    {dayjs(checkOut).format('MMM D, YYYY')}
                                </Text>
                            </div>
                            <div className={classes.detailRow}>
                                <Text size='sm' c='dimmed'>
                                    Nights
                                </Text>
                                <Text size='sm' fw={500}>
                                    {nights}
                                </Text>
                            </div>
                            <div className={classes.detailRow}>
                                <Text size='sm' c='dimmed'>
                                    Guests
                                </Text>
                                <Text size='sm' fw={500}>
                                    {guests}
                                </Text>
                            </div>
                        </Stack>
                    </Box>

                    <Stack gap='xs'>
                        {isQuoteLoading ? (
                            <>
                                <Skeleton height={18} />
                                <Skeleton height={18} />
                            </>
                        ) : (
                            <>
                                <Group justify='space-between'>
                                    <Text size='sm' className={classes.priceBreakdown}>
                                        &euro;{displayAvg.toFixed(2)}
                                        {useDynamic ? ' avg' : ''} &times; {nights} night
                                        {nights > 1 ? 's' : ''}
                                    </Text>
                                    <Text size='sm' className={classes.priceBreakdown}>
                                        &euro;{displayTotal.toFixed(2)}
                                    </Text>
                                </Group>
                                {showFallbackNotice && (
                                    <Text size='xs' c='dimmed'>
                                        Live pricing unavailable — showing base rate. Final total confirmed on submit.
                                    </Text>
                                )}

                                {useDynamic && quote.durationDiscount ? (
                                    <DurationDiscountSummary
                                        discount={quote.durationDiscount}
                                        discountedTotal={displayTotal}
                                        mode={mode}
                                    />
                                ) : (
                                    <>
                                        <Divider />
                                        <Group justify='space-between'>
                                            <Text className={classes.totalLabel}>Total</Text>
                                            <Text className={classes.totalAmount}>&euro;{displayTotal.toFixed(2)}</Text>
                                        </Group>
                                    </>
                                )}
                            </>
                        )}
                    </Stack>

                    <Group justify='flex-end' mt='sm'>
                        <Button variant='subtle' color='gray' onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={confirmDisabled}
                            loading={createBooking.isPending}
                            className={classes.confirmButton}
                        >
                            {confirmDisabled ? 'Calculating price…' : 'Confirm Booking'}
                        </Button>
                    </Group>
                </Stack>
            )}

            {status === 'success' && (
                <Stack align='center' gap='md' py='xl'>
                    <div className={classes.successCheckWrapper}>
                        <IconCheck size={36} className={classes.successCheck} />
                    </div>
                    <Text className={classes.successTitle}>Booking Confirmed!</Text>
                    <Text ta='center' c='dimmed'>
                        Your booking for <span className={classes.successPropertyName}>{propertyTitle}</span> has been
                        submitted successfully.
                    </Text>
                    <Button fullWidth onClick={() => navigate('/bookings')} mt='sm'>
                        View My Bookings
                    </Button>
                </Stack>
            )}

            {status === 'conflict' && (
                <Stack gap='md' py='md'>
                    <Alert icon={<IconAlertCircle size={16} />} color='red' title='Dates Unavailable' radius='md'>
                        These dates are no longer available. Someone else may have booked them.
                    </Alert>
                    <Button fullWidth variant='outline' onClick={handleClose}>
                        Choose New Dates
                    </Button>
                </Stack>
            )}

            {status === 'drift' && drift && (
                <Stack gap='md' py='md'>
                    <Alert icon={<IconArrowsExchange size={16} />} color='yellow' title='Price updated' radius='md'>
                        The price for these dates changed since you started checkout.
                    </Alert>
                    <Box className={classes.detailsCard}>
                        <Stack gap='xs'>
                            <div className={classes.detailRow}>
                                <Text size='sm' c='dimmed'>
                                    Previous total
                                </Text>
                                <Text size='sm' td='line-through'>
                                    &euro;{drift.expectedTotal.toFixed(2)}
                                </Text>
                            </div>
                            <div className={classes.detailRow}>
                                <Text size='sm' c='dimmed'>
                                    New total
                                </Text>
                                <Text size='sm' fw={700}>
                                    &euro;{drift.newTotal.toFixed(2)}
                                </Text>
                            </div>
                        </Stack>
                    </Box>
                    <Group justify='flex-end'>
                        <Button variant='subtle' color='gray' onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAtNewPrice}
                            loading={createBooking.isPending}
                            className={classes.confirmButton}
                        >
                            Confirm at new price
                        </Button>
                    </Group>
                </Stack>
            )}

            {status === 'error' && (
                <Stack gap='md' py='md'>
                    <Alert icon={<IconAlertCircle size={16} />} color='red' title='Booking Failed' radius='md'>
                        {errorMessage}
                    </Alert>
                    <Group justify='flex-end'>
                        <Button variant='subtle' color='gray' onClick={handleClose}>
                            Close
                        </Button>
                        <Button onClick={() => setStatus('summary')}>Try Again</Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
