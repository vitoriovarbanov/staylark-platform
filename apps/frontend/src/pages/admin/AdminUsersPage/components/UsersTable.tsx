import { useMemo } from 'react';
import { ActionIcon, Badge, Group, Menu, Text } from '@mantine/core';
import { IconDotsVertical, IconPencil, IconRotate, IconUserOff } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { AdminUser, UserRole } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef, RowDataAttributes } from '@/components/DataTable/types';

const DATE_FORMAT = 'D MMM YYYY';

const ROLE_BADGE_COLOR: Record<UserRole, string> = {
    USER: 'gray',
    MANAGER: 'blue',
    ADMIN: 'grape'
};

interface UsersTableProps {
    users: AdminUser[];
    isLoading: boolean;
    currentUserId?: string;
    onEdit: (user: AdminUser) => void;
    onDeactivate: (user: AdminUser) => void;
    onActivate: (user: AdminUser) => void;
}

export function UsersTable({ users, isLoading, currentUserId, onEdit, onDeactivate, onActivate }: UsersTableProps) {
    const columns: ColumnDef<AdminUser>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Name',
                render: row => (
                    <Group gap={6} wrap='nowrap'>
                        <Text fw={500}>{row.name}</Text>
                        {row.id === currentUserId && (
                            <Badge size='xs' variant='light' color='gray'>
                                You
                            </Badge>
                        )}
                    </Group>
                )
            },
            {
                key: 'email',
                header: 'Email',
                render: row => <Text size='sm'>{row.email}</Text>
            },
            {
                key: 'role',
                header: 'Role',
                render: row => (
                    <Badge color={ROLE_BADGE_COLOR[row.role]} variant='light'>
                        {row.role}
                    </Badge>
                )
            },
            {
                key: 'joined',
                header: 'Joined',
                render: row => <Text size='sm'>{dayjs(row.createdAt).format(DATE_FORMAT)}</Text>
            },
            {
                key: 'status',
                header: 'Status',
                render: row =>
                    row.deletedAt ? (
                        <Badge color='gray' variant='light'>
                            Inactive
                        </Badge>
                    ) : (
                        <Badge color='green' variant='light'>
                            Active
                        </Badge>
                    )
            },
            {
                key: 'actions',
                header: '',
                width: 60,
                align: 'right',
                render: row => {
                    const isSelf = row.id === currentUserId;
                    return (
                        <Menu shadow='md' position='bottom-end'>
                            <Menu.Target>
                                <ActionIcon variant='subtle' aria-label='Actions'>
                                    <IconDotsVertical size={16} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {row.deletedAt ? (
                                    <Menu.Item
                                        color='green'
                                        leftSection={<IconRotate size={14} />}
                                        onClick={() => onActivate(row)}
                                    >
                                        Activate
                                    </Menu.Item>
                                ) : (
                                    <>
                                        <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onEdit(row)}>
                                            Edit
                                        </Menu.Item>
                                        <Menu.Item
                                            color='red'
                                            leftSection={<IconUserOff size={14} />}
                                            disabled={isSelf}
                                            onClick={() => onDeactivate(row)}
                                        >
                                            Deactivate
                                        </Menu.Item>
                                    </>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    );
                }
            }
        ],
        [currentUserId, onEdit, onDeactivate, onActivate]
    );

    const getRowAttributes = (row: AdminUser): RowDataAttributes => ({
        'data-inactive': row.deletedAt ? 'true' : undefined
    });

    return (
        <DataTable
            data={users}
            columns={columns}
            isLoading={isLoading}
            getRowKey={row => row.id}
            getRowAttributes={getRowAttributes}
            emptyState={
                <EmptyState
                    variant='compact'
                    icon={IconUserOff}
                    title='No users found'
                    body='Try adjusting the search or filters, or invite a new user.'
                />
            }
        />
    );
}
