import { Badge, Text } from '@mantine/core';
import { IconAlertTriangle, IconHelp } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { Ticket } from '@staylark/contract';
import { CategoryBadge } from '@/features/tickets/components/CategoryBadge';
import { PriorityBadge } from '@/features/tickets/components/PriorityBadge';
import { STATUS_LABELS, shortTicketId } from '@/features/tickets/utils/routing-labels';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef, RowDataAttributes } from '@/components/DataTable/types';
import '@/components/DataTable/DataTable.statuses.module.css';
import classes from '../AdminTicketsPage.module.css';

const STATUS_COLORS: Record<Ticket['status'], string> = {
    OPEN: 'blue',
    IN_PROGRESS: 'yellow',
    RESOLVED: 'green',
    DISMISSED: 'gray'
};

interface TicketsTableProps {
    tickets: Ticket[];
    isLoading: boolean;
    onRowClick: (id: string) => void;
}

function getTicketRowAttributes(ticket: Ticket): RowDataAttributes {
    const isCritical = ticket.priority === 'CRITICAL' || ticket.category === 'EMERGENCY';
    if (isCritical) return { 'data-priority': 'CRITICAL' };
    if (ticket.needsReview) return { 'data-flag': 'needs-review' };
    if (ticket.needsAssignment) return { 'data-flag': 'needs-assignment' };
    return {};
}

export function TicketsTable({ tickets, isLoading, onRowClick }: TicketsTableProps) {
    const columns: ColumnDef<Ticket>[] = [
        {
            key: 'ticket',
            header: 'Ticket',
            mono: true,
            render: t => shortTicketId(t.id)
        },
        {
            key: 'summary',
            header: 'Summary',
            render: t => (
                <Text size='sm' lineClamp={2} maw={360}>
                    {t.summary ?? <em>Pending review</em>}
                </Text>
            )
        },
        { key: 'category', header: 'Category', render: t => <CategoryBadge category={t.category} size='xs' /> },
        {
            key: 'priority',
            header: 'Priority',
            render: t => {
                const isCritical = t.priority === 'CRITICAL' || t.category === 'EMERGENCY';
                return (
                    <span className={classes.priorityCell}>
                        <PriorityBadge priority={t.priority} size='xs' />
                        {isCritical && (
                            <IconAlertTriangle
                                size={14}
                                className={classes.warningIcon}
                                aria-label='Critical priority'
                            />
                        )}
                        {t.needsReview && (
                            <IconHelp size={14} className={classes.reviewIcon} aria-label='Needs review' />
                        )}
                    </span>
                );
            }
        },
        {
            key: 'status',
            header: 'Status',
            render: t => (
                <Badge color={STATUS_COLORS[t.status]} variant='light' size='xs' radius='sm'>
                    {STATUS_LABELS[t.status]}
                </Badge>
            )
        },
        {
            key: 'replies',
            header: 'Replies',
            render: t =>
                t.messageCount > 0 ? (
                    <Text size='sm' c='dimmed'>
                        {t.messageCount}
                    </Text>
                ) : null
        },
        {
            key: 'assignee',
            header: 'Assignee',
            render: t => {
                if (!t.assignedToId) {
                    return (
                        <Badge color='gray' variant='light' size='xs' radius='sm'>
                            Unassigned
                        </Badge>
                    );
                }
                return (
                    <Text size='sm' lineClamp={1} maw={160}>
                        {t.assignedToName ?? 'Assigned'}
                    </Text>
                );
            }
        },
        {
            key: 'property',
            header: 'Property',
            render: t => (
                <Text size='sm' lineClamp={1} maw={180}>
                    {t.propertyTitle}
                </Text>
            )
        },
        {
            key: 'reported',
            header: 'Reported',
            render: t => (
                <Text size='sm' c='dimmed'>
                    {dayjs(t.createdAt).format('D MMM · HH:mm')}
                </Text>
            )
        }
    ];

    return (
        <div className={classes.tableWrapper}>
            <DataTable<Ticket>
                data={tickets}
                columns={columns}
                isLoading={isLoading}
                getRowKey={t => t.id}
                getRowAttributes={getTicketRowAttributes}
                onRowClick={t => onRowClick(t.id)}
                minWidth={900}
            />
        </div>
    );
}
