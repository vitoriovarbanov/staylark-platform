import type { ReactNode } from 'react';

export interface ColumnDef<T> {
    key: string;
    header: ReactNode;
    width?: number | string;
    align?: 'left' | 'right' | 'center';
    mono?: boolean;
    render: (row: T) => ReactNode;
}

export interface DataTableSelection<T> {
    selectedIds: Set<string>;
    isSelectable: (row: T) => boolean;
    onToggleRow: (id: string) => void;
    onToggleAll: (checked: boolean) => void;
}

export type RowDataAttributes = Record<`data-${string}`, string | undefined>;
