import { Button } from '@mantine/core';
import { IconMoodEmpty, IconCalendarOff } from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';

interface EmptyFeedbackStateProps {
    hasDateFilter?: boolean;
    onClearDateRange?: () => void;
}

/** "No feedback yet" state shown when aggregation returns totalCount === 0.
 *  When a date filter is active, the empty state suggests clearing it instead
 *  of leaving the operator wondering whether the property has any feedback at all. */
export function EmptyFeedbackState({ hasDateFilter, onClearDateRange }: EmptyFeedbackStateProps) {
    return (
        <EmptyState
            icon={IconMoodEmpty}
            title={hasDateFilter ? 'No feedback in this date range' : 'No feedback yet'}
            body={
                hasDateFilter
                    ? 'No guests submitted feedback during the selected period. Try widening the range or view all feedback for this property.'
                    : 'No guests have submitted feedback for this property yet.'
            }
            action={
                hasDateFilter && onClearDateRange ? (
                    <Button
                        variant='light'
                        color='amber'
                        size='xs'
                        leftSection={<IconCalendarOff size={14} />}
                        onClick={onClearDateRange}
                    >
                        Show all time
                    </Button>
                ) : undefined
            }
        />
    );
}
