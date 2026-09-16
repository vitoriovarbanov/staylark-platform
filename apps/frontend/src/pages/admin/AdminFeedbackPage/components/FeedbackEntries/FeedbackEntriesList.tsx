// Accordion list, not tabular. Intentional alt design vs admin <DataTable>.
// Revisit if a second accordion-list pattern lands (see FE-008 NEEDS-DECISION).
import { type ReactNode } from 'react';
import { Accordion, Badge, Center, Group, Pagination, Paper, Stack, Title } from '@mantine/core';
import { IconMessageOff } from '@tabler/icons-react';
import type { Feedback } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { FeedbackEntryItem } from './FeedbackEntryItem';

interface Props {
    feedbacks: Feedback[];
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalFeedback: number;
    sortControl?: ReactNode;
}

/**
 * Paginated accordion list of individual feedback entries.
 * Collapsed: sentiment badge + score + transcription preview + date
 * Expanded: full transcription, topic badges, summary
 */
export function FeedbackEntriesList({ feedbacks, page, totalPages, onPageChange, totalFeedback, sortControl }: Props) {
    return (
        <Paper p='md' radius='md' withBorder>
            <Group mb='md' justify='space-between'>
                <Group gap='xs'>
                    <Title order={5}>All Feedback</Title>
                    <Badge variant='light'>{totalFeedback}</Badge>
                </Group>
                {sortControl}
            </Group>
            {feedbacks.length === 0 ? (
                <EmptyState
                    variant='compact'
                    icon={IconMessageOff}
                    title='No feedback in this period'
                    body='Try widening the date range to see more entries.'
                />
            ) : (
                <Stack gap='md'>
                    <Accordion variant='separated' radius='md'>
                        {feedbacks.map(fb => (
                            <FeedbackEntryItem key={fb.id} feedback={fb} />
                        ))}
                    </Accordion>
                    {totalPages > 1 && (
                        <Center>
                            <Pagination total={totalPages} value={page} onChange={onPageChange} />
                        </Center>
                    )}
                </Stack>
            )}
        </Paper>
    );
}
