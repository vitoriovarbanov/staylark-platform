import { useState } from 'react';
import { Stack } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import type { BookingWithRelations } from '@/hooks/api/use-bookings';
import { BookingTicket } from '../BookingTicket/BookingTicket';
import classes from './BookingSection.module.css';

type SectionVariant = 'active' | 'upcoming' | 'past' | 'cancelled';

interface BookingSectionProps {
    title: string;
    bookings: BookingWithRelations[];
    variant?: SectionVariant;
    initialVisible?: number;
}

export function BookingSection({ title, bookings, variant = 'upcoming', initialVisible = 3 }: BookingSectionProps) {
    const [expanded, setExpanded] = useState(false);

    if (bookings.length === 0) return null;

    const visible = expanded ? bookings : bookings.slice(0, initialVisible);
    const canExpand = !expanded && bookings.length > initialVisible;
    const hiddenCount = bookings.length - initialVisible;

    return (
        <section className={classes.section} data-variant={variant} aria-labelledby={`booking-section-${variant}`}>
            <header className={classes.header}>
                <span className={classes.tick} aria-hidden />
                <h2 id={`booking-section-${variant}`} className={classes.title}>
                    {title}
                </h2>
                <span className={classes.perforation} aria-hidden />
                <span className={classes.count} aria-label={`${bookings.length} bookings`}>
                    {bookings.length}
                </span>
            </header>

            <Stack gap='md'>
                {visible.map((booking, i) => (
                    <BookingTicket key={booking.id} booking={booking} index={i} />
                ))}
            </Stack>

            {canExpand && (
                <button type='button' className={classes.showMore} onClick={() => setExpanded(true)}>
                    Show {hiddenCount} more
                    <IconChevronDown size={14} stroke={2} />
                </button>
            )}
        </section>
    );
}
