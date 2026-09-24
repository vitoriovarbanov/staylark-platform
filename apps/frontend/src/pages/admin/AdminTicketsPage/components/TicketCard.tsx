import { Avatar, Badge, Box, Card, Group, Stack, Text } from '@mantine/core';
import { IconBuilding, IconMessageDots } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Ticket } from '@staylark/contract';
import { CategoryBadge } from '@/features/tickets/components/CategoryBadge';
import { PriorityBadge } from '@/features/tickets/components/PriorityBadge';
import { STATUS_LABELS } from '@/features/tickets/utils/routing-labels';
import classes from '../AdminTicketsPage.module.css';

dayjs.extend(relativeTime);

// Status is shown as a low-chroma dot + label so it never blurs with the
// priority badge (e.g. MEDIUM priority and IN_PROGRESS status are both yellow).
const STATUS_DOT: Record<Ticket['status'], string> = {
    OPEN: 'var(--mantine-color-blue-5)',
    IN_PROGRESS: 'var(--mantine-color-yellow-5)',
    RESOLVED: 'var(--mantine-color-green-6)',
    DISMISSED: 'var(--mantine-color-gray-5)'
};

// Open tickets older than this surface their age in red — a triage-staleness cue.
const AGING_DAYS = 7;

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
    const ageDays = dayjs().diff(dayjs(ticket.createdAt), 'day');
    const aging = ticket.status !== 'RESOLVED' && ticket.status !== 'DISMISSED' && ageDays >= AGING_DAYS;
    const ariaLabel = `${ticket.priority} priority ticket, ${STATUS_LABELS[ticket.status]}, ${ticket.propertyTitle}`;

    return (
        <Card
            withBorder
            radius='md'
            padding='md'
            className={classes.card}
            data-priority={ticket.priority}
            data-status={ticket.status}
            data-awaiting-reply={ticket.awaitingStaffReply || undefined}
            style={{ height: '100%' }}
            aria-label={ticket.awaitingStaffReply ? `${ariaLabel}, new guest reply awaiting response` : ariaLabel}
        >
            <Stack gap={8} h='100%' className={classes.cardBody}>
                {ticket.awaitingStaffReply && (
                    <Badge
                        color='brand'
                        variant='filled'
                        radius='sm'
                        size='sm'
                        leftSection={<IconMessageDots size={12} />}
                        className={classes.unreadBadge}
                    >
                        New guest reply
                    </Badge>
                )}
                <Group justify='space-between' wrap='nowrap' gap='xs'>
                    <Group gap='xs' wrap='nowrap'>
                        <PriorityBadge priority={ticket.priority} size='sm' />
                        <Group gap={6} wrap='nowrap'>
                            <Box className={classes.statusDot} style={{ background: STATUS_DOT[ticket.status] }} />
                            <Text size='xs' c='dimmed' fw={500}>
                                {STATUS_LABELS[ticket.status]}
                            </Text>
                        </Group>
                    </Group>
                    <Text
                        size='xs'
                        c={aging ? 'red.7' : 'dimmed'}
                        fw={aging ? 600 : 400}
                        className={classes.time}
                        title={`Reported ${dayjs(ticket.createdAt).format('D MMM YYYY, HH:mm')}`}
                    >
                        {dayjs(ticket.createdAt).fromNow()}
                    </Text>
                </Group>

                {ticket.summary ? (
                    <Text className={classes.summary} lineClamp={2} style={{ flex: 1 }}>
                        {ticket.summary}
                    </Text>
                ) : (
                    <Text className={classes.summary} c='dimmed' fs='italic' style={{ flex: 1 }}>
                        Pending review
                    </Text>
                )}

                <Group justify='space-between' wrap='nowrap' gap='xs' className={classes.footer}>
                    <Group gap={6} wrap='nowrap' style={{ minWidth: 0 }}>
                        <CategoryBadge category={ticket.category} size='xs' />
                        <Group gap={4} wrap='nowrap' style={{ minWidth: 0 }}>
                            <IconBuilding size={13} className={classes.metaIcon} />
                            <Text size='xs' c='dimmed' lineClamp={1}>
                                {ticket.propertyTitle} · {ticket.propertyCity}
                            </Text>
                        </Group>
                    </Group>
                    {ticket.assignedToId ? (
                        <Group gap={6} wrap='nowrap'>
                            <Avatar size={22} radius='xl' color='brand'>
                                {initials(ticket.assignedToName ?? '?')}
                            </Avatar>
                            <Text size='xs' lineClamp={1} className={classes.assigneeName}>
                                {ticket.assignedToName ?? 'Assigned'}
                            </Text>
                        </Group>
                    ) : (
                        <Badge color='amber' variant='light' size='sm' radius='sm'>
                            Unassigned
                        </Badge>
                    )}
                </Group>
            </Stack>
        </Card>
    );
}
