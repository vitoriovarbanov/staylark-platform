import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Center, Pagination, Stack, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { AdminUpdateUser, AdminUser, UserListQuery, UserRole, UserSortField } from '@staylark/contract';
import { useAuth } from '@/contexts/auth-context';
import { useUsers, useUpdateUser, useDeactivateUser, useActivateUser } from '@/hooks/api/use-users';
import { useCreateInvitation } from '@/hooks/api/use-invitations';
import { UsersFilterBar } from './components/UsersFilterBar';
import { UsersTable } from './components/UsersTable';
import { PendingInvitationsSection } from './components/PendingInvitationsSection';
import { InviteUserModal } from './components/InviteUserModal';
import { EditUserModal } from './components/EditUserModal';
import { DeactivateUserConfirmModal } from './components/DeactivateUserConfirmModal';

const PAGE_LIMIT = 20;

function errorMessage(err: unknown, fallback: string): string {
    return (err as { message?: string })?.message ?? fallback;
}

export function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const roleParam = (searchParams.get('role') as UserRole | null) ?? null;
    const searchParam = searchParams.get('search') ?? '';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const sortBy = (searchParams.get('sortBy') as UserSortField | null) ?? null;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ?? 'desc';
    const page = Number(searchParams.get('page') ?? '1');

    // Local search input, debounced before it hits the URL/query.
    const [searchInput, setSearchInput] = useState(searchParam);
    const [debouncedSearch] = useDebouncedValue(searchInput, 250);

    const filters: Partial<UserListQuery> = useMemo(
        () => ({
            role: roleParam ?? undefined,
            search: searchParam || undefined,
            includeDeleted,
            ...(sortBy && { sortBy, sortOrder }),
            page,
            limit: PAGE_LIMIT
        }),
        [roleParam, searchParam, includeDeleted, sortBy, sortOrder, page]
    );

    const usersQuery = useUsers(filters);
    const users = usersQuery.data?.data ?? [];
    const total = usersQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    const createMutation = useCreateInvitation();
    const updateMutation = useUpdateUser();
    const deactivateMutation = useDeactivateUser();
    const activateMutation = useActivateUser();

    const [inviteOpen, setInviteOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [deactivatingUser, setDeactivatingUser] = useState<AdminUser | null>(null);

    const updateParam = useCallback(
        (key: string, value: string | null) => {
            const next = new URLSearchParams(searchParams);
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
            next.set('page', '1');
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const handleSortChange = useCallback(
        (nextSortBy: string | null, nextSortOrder: 'asc' | 'desc') => {
            const next = new URLSearchParams(searchParams);
            if (nextSortBy) {
                next.set('sortBy', nextSortBy);
                next.set('sortOrder', nextSortOrder);
            } else {
                next.delete('sortBy');
                next.delete('sortOrder');
            }
            next.set('page', '1');
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    // Push the debounced search into the URL (resetting to page 1).
    useEffect(() => {
        if (debouncedSearch === searchParam) return;
        updateParam('search', debouncedSearch || null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handlePageChange = useCallback(
        (next: number) => {
            const params = new URLSearchParams(searchParams);
            params.set('page', String(next));
            setSearchParams(params, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const handleInvite = (values: { name: string; email: string; role: UserRole }) => {
        createMutation.mutate(values, {
            onSuccess: () => {
                notifications.show({ color: 'green', message: `Invitation sent to ${values.email}` });
                setInviteOpen(false);
            },
            onError: err => notifications.show({ color: 'red', message: errorMessage(err, 'Failed to invite user.') })
        });
    };

    const handleEditSubmit = (patch: AdminUpdateUser) => {
        if (!editingUser) return;
        updateMutation.mutate(
            { id: editingUser.id, data: patch },
            {
                onSuccess: () => {
                    notifications.show({ color: 'green', message: 'User updated.' });
                    setEditingUser(null);
                },
                onError: err =>
                    notifications.show({ color: 'red', message: errorMessage(err, 'Failed to update user.') })
            }
        );
    };

    const handleConfirmDeactivate = (successorManagerId?: string) => {
        if (!deactivatingUser) return;
        deactivateMutation.mutate(
            { id: deactivatingUser.id, successorManagerId },
            {
                onSuccess: () => {
                    notifications.show({ color: 'green', message: 'User deactivated.' });
                    setDeactivatingUser(null);
                },
                onError: err =>
                    notifications.show({ color: 'red', message: errorMessage(err, 'Failed to deactivate user.') })
            }
        );
    };

    const handleActivate = useCallback(
        (target: AdminUser) => {
            activateMutation.mutate(target.id, {
                onSuccess: () => notifications.show({ color: 'green', message: 'User activated.' }),
                onError: err =>
                    notifications.show({ color: 'red', message: errorMessage(err, 'Failed to activate user.') })
            });
        },
        [activateMutation]
    );

    return (
        <Stack gap='lg'>
            <Title order={2}>Users</Title>

            <UsersFilterBar
                search={searchInput}
                role={roleParam}
                includeDeleted={includeDeleted}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onChangeSearch={setSearchInput}
                onChangeRole={value => updateParam('role', value)}
                onToggleIncludeDeleted={value => updateParam('includeDeleted', value ? 'true' : null)}
                onSortChange={handleSortChange}
                onInvite={() => setInviteOpen(true)}
            />

            <PendingInvitationsSection />

            <UsersTable
                users={users}
                isLoading={usersQuery.isLoading}
                currentUserId={currentUser?.id}
                onEdit={setEditingUser}
                onDeactivate={setDeactivatingUser}
                onActivate={handleActivate}
            />

            {totalPages > 1 && (
                <Center>
                    <Pagination value={page} onChange={handlePageChange} total={totalPages} />
                </Center>
            )}

            <InviteUserModal
                opened={inviteOpen}
                isSaving={createMutation.isPending}
                onClose={() => setInviteOpen(false)}
                onSubmit={handleInvite}
            />

            <EditUserModal
                user={editingUser}
                isSaving={updateMutation.isPending}
                isSelf={editingUser?.id === currentUser?.id}
                onClose={() => setEditingUser(null)}
                onSubmit={handleEditSubmit}
            />

            <DeactivateUserConfirmModal
                user={deactivatingUser}
                isPending={deactivateMutation.isPending}
                onClose={() => setDeactivatingUser(null)}
                onConfirm={handleConfirmDeactivate}
            />
        </Stack>
    );
}
