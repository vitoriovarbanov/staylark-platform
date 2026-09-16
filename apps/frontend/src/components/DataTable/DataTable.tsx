import { type ReactNode } from 'react';
import { Table, Checkbox, Skeleton } from '@mantine/core';
import type { ColumnDef, DataTableSelection, RowDataAttributes } from './types';
import classes from './DataTable.module.css';

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    isLoading?: boolean;
    skeletonRowCount?: number;
    getRowKey: (row: T) => string;
    getRowAttributes?: (row: T) => RowDataAttributes;
    minWidth?: number;
    selection?: DataTableSelection<T>;
    pendingActionIds?: Set<string>;
    onRowClick?: (row: T) => void;
    emptyState?: ReactNode;
}

const DEFAULT_SKELETON_ROWS = 5;
const DEFAULT_MIN_WIDTH = 800;

export function DataTable<T>({
    data,
    columns,
    isLoading = false,
    skeletonRowCount = DEFAULT_SKELETON_ROWS,
    getRowKey,
    getRowAttributes,
    minWidth = DEFAULT_MIN_WIDTH,
    selection,
    pendingActionIds,
    onRowClick,
    emptyState
}: DataTableProps<T>) {
    const totalColumns = columns.length + (selection ? 1 : 0);

    const selectableRows = selection ? data.filter(selection.isSelectable) : [];
    const allSelected =
        selection !== undefined &&
        selectableRows.length > 0 &&
        selectableRows.every(r => selection.selectedIds.has(getRowKey(r)));
    const someSelected =
        selection !== undefined && selectableRows.some(r => selection.selectedIds.has(getRowKey(r))) && !allSelected;

    return (
        <Table.ScrollContainer minWidth={minWidth}>
            <Table className={classes.table} striped={false} highlightOnHover={false}>
                <Table.Thead className={classes.thead}>
                    <Table.Tr>
                        {selection && (
                            <Table.Th w={36}>
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={e => selection.onToggleAll(e.currentTarget.checked)}
                                    disabled={selectableRows.length === 0}
                                    aria-label='Select all rows'
                                />
                            </Table.Th>
                        )}
                        {columns.map(col => (
                            <Table.Th key={col.key} w={col.width} ta={col.align}>
                                {col.header}
                            </Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {isLoading &&
                        Array.from({ length: skeletonRowCount }).map((_, i) => (
                            <Table.Tr key={`sk-${i}`}>
                                <Table.Td colSpan={totalColumns}>
                                    <Skeleton h={36} radius='sm' className={classes.skeleton} />
                                </Table.Td>
                            </Table.Tr>
                        ))}

                    {!isLoading && data.length === 0 && emptyState && (
                        <Table.Tr>
                            <Table.Td colSpan={totalColumns}>
                                <div className={classes.empty}>{emptyState}</div>
                            </Table.Td>
                        </Table.Tr>
                    )}

                    {!isLoading &&
                        data.map(row => {
                            const id = getRowKey(row);
                            const rowAttrs = getRowAttributes?.(row) ?? {};
                            const isSelected = selection?.selectedIds.has(id) ?? false;
                            const isPending = pendingActionIds?.has(id) ?? false;
                            const isClickable = onRowClick !== undefined;

                            return (
                                <Table.Tr
                                    key={id}
                                    className={isClickable ? `${classes.row} ${classes.rowClickable}` : classes.row}
                                    data-selected={isSelected ? 'true' : undefined}
                                    data-pending={isPending ? 'true' : undefined}
                                    onClick={isClickable ? () => onRowClick(row) : undefined}
                                    onKeyDown={
                                        isClickable
                                            ? e => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      onRowClick(row);
                                                  }
                                              }
                                            : undefined
                                    }
                                    tabIndex={isClickable ? 0 : undefined}
                                    {...rowAttrs}
                                >
                                    {selection && (
                                        <Table.Td>
                                            <Checkbox
                                                checked={selection.selectedIds.has(id)}
                                                onChange={() => selection.onToggleRow(id)}
                                                disabled={!selection.isSelectable(row)}
                                                aria-label={`Select row ${id}`}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </Table.Td>
                                    )}
                                    {columns.map(col => (
                                        <Table.Td
                                            key={col.key}
                                            ta={col.align}
                                            className={col.mono ? classes.mono : undefined}
                                        >
                                            {col.render(row)}
                                        </Table.Td>
                                    ))}
                                </Table.Tr>
                            );
                        })}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}
