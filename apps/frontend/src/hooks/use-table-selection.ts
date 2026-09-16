import { useCallback, useMemo, useState } from 'react';

interface UseTableSelectionResult<T> {
    selectedIds: Set<string>;
    selectedRows: T[];
    toggleRow: (id: string) => void;
    toggleAll: (checked: boolean) => void;
    clearSelection: () => void;
}

export function useTableSelection<T>(
    rows: T[],
    getId: (row: T) => string,
    isSelectable: (row: T) => boolean
): UseTableSelectionResult<T> {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const selectedRows = useMemo(() => rows.filter(r => selectedIds.has(getId(r))), [rows, selectedIds, getId]);

    const toggleRow = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback(
        (checked: boolean) => {
            setSelectedIds(checked ? new Set(rows.filter(isSelectable).map(getId)) : new Set());
        },
        [rows, getId, isSelectable]
    );

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    return { selectedIds, selectedRows, toggleRow, toggleAll, clearSelection };
}
