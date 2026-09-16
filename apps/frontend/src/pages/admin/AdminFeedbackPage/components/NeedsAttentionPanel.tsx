import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { Feedback } from '@staylark/contract';
import { sentimentBadgeColor, truncateWithEllipsis } from '../utils';

interface Props {
    items: Feedback[];
}

/** Surfaces recent negative / low-score feedback. Renders nothing when empty. */
export function NeedsAttentionPanel({ items }: Props) {
    if (items.length === 0) return null;

    return (
        <Paper
            p='md'
            radius='md'
            withBorder
            style={{ borderColor: 'var(--mantine-color-red-3)', background: 'var(--mantine-color-red-0)' }}
        >
            <Stack gap='sm'>
                <Group gap='xs'>
                    <IconAlertTriangle size={18} color='var(--mantine-color-red-6)' />
                    <Title order={5}>Needs Attention</Title>
                    <Badge color='red' variant='light' size='sm'>
                        {items.length}
                    </Badge>
                </Group>
                <Stack gap='xs'>
                    {items.map(f => (
                        <Paper key={f.id} p='sm' radius='sm' withBorder bg='white'>
                            <Group justify='space-between' wrap='nowrap' align='flex-start'>
                                <Stack gap={4} style={{ minWidth: 0 }}>
                                    <Group gap='xs'>
                                        <Badge color={sentimentBadgeColor(f.sentiment)} variant='light' size='xs'>
                                            {f.sentiment ?? 'N/A'}
                                        </Badge>
                                        {f.score !== null && (
                                            <Text size='xs' fw={600}>
                                                {f.score}/5
                                            </Text>
                                        )}
                                    </Group>
                                    <Text size='sm'>
                                        {truncateWithEllipsis(f.summary ?? f.transcription ?? '', 140)}
                                    </Text>
                                </Stack>
                                <Text size='xs' c='dimmed' style={{ flexShrink: 0 }}>
                                    {dayjs(f.createdAt).format('MMM D')}
                                </Text>
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            </Stack>
        </Paper>
    );
}
