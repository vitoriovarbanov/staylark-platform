import { Group, Text, Title } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import dayjs from 'dayjs';
import classes from './AvailabilityCalendar.module.css';

interface AvailabilityCalendarProps {
    checkIn: Date | null;
    checkOut: Date | null;
    excludeDate?: (date: Date) => boolean;
}

export function AvailabilityCalendar({ checkIn, checkOut, excludeDate }: AvailabilityCalendarProps) {
    const isMobile = useMediaQuery('(max-width: 48em)');

    const getDayProps = (date: Date) => {
        const isBooked = excludeDate?.(date) ?? false;
        const isPast = dayjs(date).isBefore(dayjs(), 'day');
        const isInRange =
            checkIn &&
            checkOut &&
            dayjs(date).isAfter(dayjs(checkIn).subtract(1, 'day')) &&
            dayjs(date).isBefore(dayjs(checkOut).add(1, 'day'));

        if (isBooked) {
            return {
                className: classes.calendarBooked,
                disabled: true
            };
        }
        if (isPast) {
            return { disabled: true };
        }
        if (isInRange) {
            return {
                className: classes.calendarSelected
            };
        }
        return {
            className: classes.calendarAvailable
        };
    };

    return (
        <div>
            <Group justify='space-between' align='baseline' mb='xs'>
                <Title order={4}>Availability</Title>
            </Group>
            <Text size='sm' c='dimmed' mb='sm'>
                Use the booking panel to select your dates. Unavailable dates are shown below.
            </Text>
            <Group gap='sm' mb='md'>
                <Group gap={6}>
                    <div className={classes.calendarLegendDot} data-type='available' />
                    <Text size='xs' c='dimmed'>
                        Available
                    </Text>
                </Group>
                <Group gap={6}>
                    <div className={classes.calendarLegendDot} data-type='booked' />
                    <Text size='xs' c='dimmed'>
                        Unavailable
                    </Text>
                </Group>
                {checkIn && checkOut && (
                    <Group gap={6}>
                        <div className={classes.calendarLegendDot} data-type='selected' />
                        <Text size='xs' c='dimmed'>
                            Your stay
                        </Text>
                    </Group>
                )}
            </Group>
            <Calendar numberOfColumns={isMobile ? 1 : 2} minDate={new Date()} getDayProps={getDayProps} static />
        </div>
    );
}
