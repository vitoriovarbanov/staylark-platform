import { Button } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import type { UserRole } from '@staylark/contract';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import type { SortOption } from '@/components/SortControl/SortControl';

interface UsersFilterBarProps {
    search: string;
    role: UserRole | null;
    includeDeleted: boolean;
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
    onChangeSearch: (value: string) => void;
    onChangeRole: (value: UserRole | null) => void;
    onToggleIncludeDeleted: (value: boolean) => void;
    onSortChange: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
    onInvite: () => void;
}

const ALL_ROLES = '__all__';

const ROLE_OPTIONS = [
    { value: ALL_ROLES, label: 'All roles' },
    { value: 'USER', label: 'User' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' }
];

const SORT_OPTIONS: SortOption[] = [
    { value: 'createdAt', label: 'Joined' },
    { value: 'name', label: 'Name' },
    { value: 'role', label: 'Role' }
];

export function UsersFilterBar({
    search,
    role,
    includeDeleted,
    sortBy,
    sortOrder,
    onChangeSearch,
    onChangeRole,
    onToggleIncludeDeleted,
    onSortChange,
    onInvite
}: UsersFilterBarProps) {
    return (
        <FilterBar>
            <FilterBar.TextInput
                placeholder='Search name or email'
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={e => onChangeSearch(e.currentTarget.value)}
                w={260}
            />
            <FilterBar.Select
                data={ROLE_OPTIONS}
                value={role ?? ALL_ROLES}
                onChange={value => onChangeRole(value === ALL_ROLES || value === null ? null : (value as UserRole))}
                w={160}
            />
            <FilterBar.Switch
                label='Include inactive'
                checked={includeDeleted}
                onChange={e => onToggleIncludeDeleted(e.currentTarget.checked)}
            />
            <FilterBar.Sort
                options={SORT_OPTIONS}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onChange={onSortChange}
                defaultSortBy='createdAt'
            />
            <FilterBar.Actions>
                <Button leftSection={<IconPlus size={16} />} onClick={onInvite}>
                    Invite user
                </Button>
            </FilterBar.Actions>
        </FilterBar>
    );
}
