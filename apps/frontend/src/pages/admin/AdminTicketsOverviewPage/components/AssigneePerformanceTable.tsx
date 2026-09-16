import { Paper, Stack, Table, Text } from '@mantine/core';
import { IconUserOff } from '@tabler/icons-react';
import type { TicketStats } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { formatResolutionHours } from '../utils';

interface Props {
    rows: TicketStats['byAssignee'];
}

/** Per-assignee load + resolution performance. Sorted by active load (backend). */
export function AssigneePerformanceTable({ rows }: Props) {
    return (
        <Paper p='md' radius='md' withBorder>
            <Stack gap='sm'>
                <Text size='sm' c='dimmed' fw={500}>
                    Workload &amp; Resolution by Assignee
                </Text>
                {rows.length === 0 ? (
                    <EmptyState
                        variant='compact'
                        icon={IconUserOff}
                        title='No assigned tickets'
                        body='Assignee workload appears once tickets are assigned.'
                    />
                ) : (
                    <Table highlightOnHover verticalSpacing='xs'>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Assignee</Table.Th>
                                <Table.Th ta='right'>Open</Table.Th>
                                <Table.Th ta='right'>In Progress</Table.Th>
                                <Table.Th ta='right'>Resolved</Table.Th>
                                <Table.Th ta='right'>Avg Resolution</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {rows.map(r => (
                                <Table.Tr key={r.assigneeId}>
                                    <Table.Td>{r.assigneeName}</Table.Td>
                                    <Table.Td ta='right'>{r.openCount}</Table.Td>
                                    <Table.Td ta='right'>{r.inProgressCount}</Table.Td>
                                    <Table.Td ta='right'>{r.resolvedCount}</Table.Td>
                                    <Table.Td ta='right'>{formatResolutionHours(r.avgResolutionHours)}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Stack>
        </Paper>
    );
}
