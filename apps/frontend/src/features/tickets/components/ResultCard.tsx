import { Stack, Button } from '@mantine/core';
import { IconCheck, IconAlertTriangle, IconHelp } from '@tabler/icons-react';
import type { Ticket } from '@staylark/contract';
import { CategoryBadge } from './CategoryBadge';
import { PriorityBadge } from './PriorityBadge';
import classes from './ResultCard.module.css';

interface ResultCardProps {
    ticket: Ticket;
    onDone: () => void;
}

const URGENT_PRIORITIES = new Set(['CRITICAL', 'HIGH'] as const);

export function ResultCard({ ticket, onDone }: ResultCardProps) {
    const isUrgent = URGENT_PRIORITIES.has(ticket.priority as 'CRITICAL' | 'HIGH') || ticket.category === 'EMERGENCY';

    return (
        <Stack gap='md'>
            <div className={classes.successRow}>
                <span className={classes.successIcon}>
                    <IconCheck size={16} stroke={2.6} />
                </span>
                <span className={classes.successLabel}>Report submitted</span>
            </div>

            {/* === GUEST'S WORDS — original transcription, no duplication of title === */}
            {ticket.transcription && (
                <section className={classes.section}>
                    <span className={classes.sectionLabel}>Guest&apos;s words</span>
                    <div className={classes.transcription}>{ticket.transcription}</div>
                </section>
            )}

            {/* === DISPATCH — category, priority === */}
            <section className={classes.section}>
                <span className={classes.sectionLabel}>Dispatch</span>
                <div className={classes.dispatchRow}>
                    <CategoryBadge category={ticket.category} />
                    <PriorityBadge priority={ticket.priority} />
                </div>
                {ticket.needsReview && (
                    <span className={classes.reviewLine}>
                        <IconHelp size={14} />
                        Our team is reviewing your report and will route it shortly.
                    </span>
                )}
            </section>

            {/* === URGENT banner === */}
            {isUrgent && (
                <div className={classes.urgentBanner}>
                    <IconAlertTriangle size={18} />
                    <span>Flagged as urgent — admin has been notified.</span>
                </div>
            )}

            <Button onClick={onDone} fullWidth size='md' className={classes.doneButton}>
                Done
            </Button>
        </Stack>
    );
}
