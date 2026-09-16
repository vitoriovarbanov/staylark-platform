import type { ReactNode } from 'react';
import { Button, Select, Switch, TextInput } from '@mantine/core';
import type { ButtonProps, SelectProps, SwitchProps, TextInputProps } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DatePickerInputProps } from '@mantine/dates';
import { IconX } from '@tabler/icons-react';
import { SortControl, type SortControlProps } from '@/components/SortControl/SortControl';
import classes from './FilterBar.module.css';

/**
 * Unified filter/sort toolbar for the admin/manager section.
 *
 * `FilterBar` is the light toolbar surface; its compound members
 * (`FilterBar.Select`, `.TextInput`, `.DateInput`, `.DateRange`, `.Switch`,
 * `.Sort`, `.Clear`, `.Actions`) pre-apply the shared styling + sensible
 * defaults (portal dropdowns, clearable affordances) so every entity page
 * renders an identical bar without re-declaring `classNames`.
 *
 * Pages still own their filter state — these are presentation wrappers only.
 */
export interface FilterBarProps {
    children: ReactNode;
    className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
    return <div className={className ? `${classes.bar} ${className}` : classes.bar}>{children}</div>;
}

const selectClassNames = {
    root: classes.field,
    input: classes.input,
    dropdown: classes.dropdown,
    option: classes.option
};
const textClassNames = { root: classes.field, input: classes.input };
const portalCombobox = { withinPortal: true, zIndex: 200 } as const;
const portalPopover = { withinPortal: true, zIndex: 200 } as const;

function FilterSelect({ miw, comboboxProps, classNames, ...props }: SelectProps) {
    return (
        <Select
            miw={miw ?? 0}
            comboboxProps={{ ...portalCombobox, ...comboboxProps }}
            classNames={{ ...selectClassNames, ...classNames }}
            {...props}
        />
    );
}

function FilterTextInput({ miw, classNames, ...props }: TextInputProps) {
    return <TextInput miw={miw ?? 0} classNames={{ ...textClassNames, ...classNames }} {...props} />;
}

function FilterDateInput({ miw, popoverProps, classNames, ...props }: Omit<DatePickerInputProps<'default'>, 'type'>) {
    return (
        <DatePickerInput
            miw={miw ?? 0}
            popoverProps={{ ...portalPopover, ...popoverProps }}
            classNames={{ ...textClassNames, ...classNames }}
            {...props}
        />
    );
}

function FilterDateRange({ miw, popoverProps, classNames, ...props }: Omit<DatePickerInputProps<'range'>, 'type'>) {
    return (
        <DatePickerInput
            type='range'
            miw={miw ?? 0}
            popoverProps={{ ...portalPopover, ...popoverProps }}
            classNames={{ ...textClassNames, ...classNames }}
            {...props}
        />
    );
}

function FilterSwitch({ size, color, ...props }: SwitchProps) {
    return <Switch size={size ?? 'sm'} color={color ?? 'brand'} {...props} />;
}

function FilterSort(props: SortControlProps) {
    return (
        <div className={classes.sort}>
            <span className={classes.sortLabel}>Sort</span>
            <SortControl {...props} classNames={selectClassNames} />
        </div>
    );
}

interface FilterClearProps extends Omit<ButtonProps, 'children'> {
    /** Hide the button entirely when no filters are active. */
    show?: boolean;
    onClick?: () => void;
    children?: ReactNode;
}

function FilterClear({ show = true, children, ...props }: FilterClearProps) {
    if (!show) return null;
    return (
        <Button
            variant='subtle'
            size='xs'
            color='gray'
            leftSection={<IconX size={14} />}
            className={classes.clear}
            {...props}
        >
            {children ?? 'Clear all'}
        </Button>
    );
}

function FilterActions({ children }: { children: ReactNode }) {
    return <div className={classes.actions}>{children}</div>;
}

FilterBar.Select = FilterSelect;
FilterBar.TextInput = FilterTextInput;
FilterBar.DateInput = FilterDateInput;
FilterBar.DateRange = FilterDateRange;
FilterBar.Switch = FilterSwitch;
FilterBar.Sort = FilterSort;
FilterBar.Clear = FilterClear;
FilterBar.Actions = FilterActions;

// Retained for non-toolbar reuse (e.g. inline table-cell editors that want the
// same input treatment). Prefer the compound members above inside a FilterBar.
// eslint-disable-next-line react-refresh/only-export-components
export const filterBarClasses = classes;
