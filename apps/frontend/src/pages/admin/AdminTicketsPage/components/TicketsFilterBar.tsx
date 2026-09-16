import type { Property, TicketCategory, TicketPriority, TicketStatus } from '@staylark/contract';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import type { SortOption } from '@/components/SortControl/SortControl';

const STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'DISMISSED', label: 'Dismissed' }
];

const PRIORITY_OPTIONS: Array<{ value: TicketPriority; label: string }> = [
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' }
];

const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = [
    { value: 'NOISE', label: 'Noise' },
    { value: 'DAMAGE', label: 'Damage' },
    { value: 'CLEANLINESS', label: 'Cleanliness' },
    { value: 'DELIVERY', label: 'Delivery' },
    { value: 'UTILITIES', label: 'Utilities' },
    { value: 'EMERGENCY', label: 'Emergency' }
];

const SORT_OPTIONS: SortOption[] = [
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'createdAt', label: 'Date reported' }
];

interface TicketsFilterBarProps {
    status: TicketStatus | null;
    priority: TicketPriority | null;
    category: TicketCategory | null;
    propertyId: string | null;
    needsAssignment: boolean;
    properties: Property[];
    assignedToId: string | null;
    assignees: { value: string; label: string }[];
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
    onSortChange: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
    onChange: (
        patch: Partial<{
            status: TicketStatus | null;
            priority: TicketPriority | null;
            category: TicketCategory | null;
            propertyId: string | null;
            needsAssignment: boolean;
            assignedToId: string | null;
        }>
    ) => void;
    onClear: () => void;
}

export function TicketsFilterBar({
    status,
    priority,
    category,
    propertyId,
    needsAssignment,
    properties,
    assignedToId,
    assignees,
    sortBy,
    sortOrder,
    onSortChange,
    onChange,
    onClear
}: TicketsFilterBarProps) {
    const propertyOptions = properties.map(p => ({ value: p.id, label: p.title }));
    const hasAny = status || priority || category || propertyId || needsAssignment || assignedToId;

    return (
        <FilterBar>
            <FilterBar.Select
                placeholder='Status'
                data={STATUS_OPTIONS}
                value={status}
                onChange={v => onChange({ status: (v as TicketStatus) ?? null })}
                clearable
                w={160}
            />
            <FilterBar.Select
                placeholder='Priority'
                data={PRIORITY_OPTIONS}
                value={priority}
                onChange={v => onChange({ priority: (v as TicketPriority) ?? null })}
                clearable
                w={160}
            />
            <FilterBar.Select
                placeholder='Category'
                data={CATEGORY_OPTIONS}
                value={category}
                onChange={v => onChange({ category: (v as TicketCategory) ?? null })}
                clearable
                w={170}
            />
            <FilterBar.Select
                placeholder='Property'
                data={propertyOptions}
                value={propertyId}
                onChange={v => onChange({ propertyId: v ?? null })}
                clearable
                searchable
                w={220}
            />
            {assignees.length > 0 && (
                <FilterBar.Select
                    placeholder='Assignee'
                    data={assignees}
                    value={assignedToId}
                    onChange={v => onChange({ assignedToId: v ?? null })}
                    clearable
                    searchable
                    w={220}
                />
            )}
            <FilterBar.Switch
                label='Unassigned only'
                checked={needsAssignment}
                onChange={e => onChange({ needsAssignment: e.currentTarget.checked })}
            />
            <FilterBar.Sort
                options={SORT_OPTIONS}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onChange={onSortChange}
                defaultSortBy='priority'
            />
            <FilterBar.Clear show={Boolean(hasAny)} onClick={onClear} />
        </FilterBar>
    );
}
