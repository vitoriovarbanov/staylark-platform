import { Badge } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { isUrgentTicket, type AdminCriticalTicket } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { CategoryBadge } from '@/features/tickets/components/CategoryBadge';
import { PriorityBadge } from '@/features/tickets/components/PriorityBadge';
import { STATUS_LABELS } from '@/features/tickets/utils/routing-labels';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import { DashboardSection } from './DashboardSection';
import { ViewAllLink } from './ViewAllLink';
import '@/components/DataTable/DataTable.statuses.module.css';

const STATUS_COLORS: Record<AdminCriticalTicket['status'], string> = {
    OPEN: 'blue',
    IN_PROGRESS: 'yellow',
    RESOLVED: 'green',
    DISMISSED: 'gray'
};

const fmt = (d: string) => dayjs(d).format('D MMM YYYY');

const columns: ColumnDef<AdminCriticalTicket>[] = [
    { key: 'property', header: 'Property', render: t => t.propertyTitle },
    { key: 'category', header: 'Category', render: t => <CategoryBadge category={t.category} size='xs' /> },
    { key: 'priority', header: 'Priority', render: t => <PriorityBadge priority={t.priority} size='xs' /> },
    {
        key: 'status',
        header: 'Status',
        render: t => (
            <Badge color={STATUS_COLORS[t.status]} variant='light' size='xs' radius='sm'>
                {STATUS_LABELS[t.status]}
            </Badge>
        )
    },
    { key: 'reported', header: 'Reported', mono: true, render: t => fmt(t.createdAt) }
];

export function CriticalTicketsTable({ tickets }: { tickets: AdminCriticalTicket[] }) {
    return (
        <DashboardSection eyebrow='Alerts' title='Critical tickets' action={<ViewAllLink to='/admin/tickets' />}>
            <DataTable<AdminCriticalTicket>
                data={tickets}
                columns={columns}
                getRowKey={t => t.id}
                getRowAttributes={t => (isUrgentTicket(t) ? { 'data-priority': 'CRITICAL' } : {})}
                minWidth={520}
                emptyState={
                    <EmptyState
                        variant='compact'
                        icon={IconCircleCheck}
                        title='No critical tickets'
                        body='All caught up — no urgent issues need attention.'
                    />
                }
            />
        </DashboardSection>
    );
}
