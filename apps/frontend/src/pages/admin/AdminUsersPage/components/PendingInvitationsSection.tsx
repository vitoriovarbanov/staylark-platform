import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Group, Menu, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDotsVertical, IconMailForward, IconX } from '@tabler/icons-react';
import type { Invitation, InvitationStatus, UserRole } from '@staylark/contract';
import { DataTable } from '@/components/DataTable/DataTable';
import type { ColumnDef } from '@/components/DataTable/types';
import { useInvitations, useResendInvitation } from '@/hooks/api/use-invitations';
import { RevokeInvitationConfirmModal } from './RevokeInvitationConfirmModal';

const ROLE_BADGE_COLOR: Record<UserRole, string> = {
    USER: 'gray',
    MANAGER: 'blue',
    ADMIN: 'grape'
};

const STATUS_CONFIG: Record<InvitationStatus, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'yellow' },
    EXPIRED: { label: 'Expired', color: 'gray' },
    REVOKED: { label: 'Revoked', color: 'red' },
    ACCEPTED: { label: 'Accepted', color: 'green' }
};

function errorMessage(err: unknown, fallback: string): string {
    return (err as { message?: string })?.message ?? fallback;
}

/** "expires in N days" relative hint for a PENDING invitation. */
function expiresInLabel(expiresAt: string): string {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days <= 0) return 'expires today';
    if (days === 1) return 'expires in 1 day';
    return `expires in ${days} days`;
}

export function PendingInvitationsSection() {
    const invitationsQuery = useInvitations();
    // Only show actionable invitations here. Accepted ones are now real users (in
    // the table below) and Revoked ones are dead, so both drop off this section.
    const invitations = useMemo(
        () => (invitationsQuery.data ?? []).filter(i => i.status === 'PENDING' || i.status === 'EXPIRED'),
        [invitationsQuery.data]
    );
    const resendMutation = useResendInvitation();
    const [revokingInvitation, setRevokingInvitation] = useState<Invitation | null>(null);

    const handleResend = (invitation: Invitation) => {
        resendMutation.mutate(invitation.id, {
            onSuccess: () =>
                notifications.show({ color: 'green', message: `Invitation resent to ${invitation.email}` }),
            onError: err =>
                notifications.show({ color: 'red', message: errorMessage(err, 'Failed to resend invitation.') })
        });
    };

    const columns: ColumnDef<Invitation>[] = useMemo(
        () => [
            {
                key: 'email',
                header: 'Email',
                render: row => <Text fw={500}>{row.email}</Text>
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
                key: 'inviter',
                header: 'Invited by',
                render: row => <Text size='sm'>{row.inviterName ?? '—'}</Text>
            },
            {
                key: 'status',
                header: 'Status',
                render: row => {
                    const config = STATUS_CONFIG[row.status];
                    return (
                        <Group gap={8} wrap='nowrap'>
                            <Badge color={config.color} variant='light'>
                                {config.label}
                            </Badge>
                            {row.status === 'PENDING' && (
                                <Text size='xs' c='dimmed'>
                                    {expiresInLabel(row.expiresAt)}
                                </Text>
                            )}
                        </Group>
                    );
                }
            },
            {
                key: 'actions',
                header: '',
                width: 60,
                align: 'right',
                render: row => {
                    const canResend = row.status === 'PENDING' || row.status === 'EXPIRED';
                    const canRevoke = row.status === 'PENDING';
                    if (!canResend && !canRevoke) return null;
                    return (
                        <Menu shadow='md' position='bottom-end'>
                            <Menu.Target>
                                <ActionIcon variant='subtle' aria-label='Actions'>
                                    <IconDotsVertical size={16} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {canResend && (
                                    <Menu.Item
                                        leftSection={<IconMailForward size={14} />}
                                        onClick={() => handleResend(row)}
                                    >
                                        Resend
                                    </Menu.Item>
                                )}
                                {canRevoke && (
                                    <Menu.Item
                                        color='red'
                                        leftSection={<IconX size={14} />}
                                        onClick={() => setRevokingInvitation(row)}
                                    >
                                        Revoke
                                    </Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    );
                }
            }
        ],
        // handleResend is stable enough for this render; keep deps minimal like UsersTable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    // Keep the section unobtrusive when there's nothing to show.
    if (!invitationsQuery.isLoading && invitations.length === 0) return null;

    return (
        <Stack gap='sm'>
            <Title order={3}>Pending invitations</Title>
            <DataTable
                data={invitations}
                columns={columns}
                isLoading={invitationsQuery.isLoading}
                getRowKey={row => row.id}
            />
            <RevokeInvitationConfirmModal invitation={revokingInvitation} onClose={() => setRevokingInvitation(null)} />
        </Stack>
    );
}
