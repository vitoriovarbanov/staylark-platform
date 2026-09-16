import type { TicketCategory, TicketStatus, TicketPriority } from '@staylark/contract';

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
    NOISE: 'Noise',
    DAMAGE: 'Damage',
    CLEANLINESS: 'Cleanliness',
    DELIVERY: 'Delivery',
    UTILITIES: 'Utilities',
    EMERGENCY: 'Emergency'
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In progress',
    RESOLVED: 'Resolved',
    DISMISSED: 'Dismissed'
};

// Reporter-facing labels. A guest who withdrew their own report sees "Withdrawn",
// not the staff-framed "Dismissed" (which reads as "we judged it not an issue").
export const STATUS_LABELS_USER: Record<TicketStatus, string> = {
    ...STATUS_LABELS,
    DISMISSED: 'Withdrawn'
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical'
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
    LOW: 'gray',
    MEDIUM: 'yellow',
    HIGH: 'orange',
    CRITICAL: 'red'
};

export function shortTicketId(id: string): string {
    return id.replace(/-/g, '').slice(0, 5).toUpperCase();
}

export function nextStatus(current: TicketStatus): TicketStatus | null {
    if (current === 'OPEN') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'RESOLVED';
    // RESOLVED and DISMISSED are terminal — reopened via a dedicated control, not the linear advance.
    return null;
}

export function nextActionLabel(current: TicketStatus): string | null {
    if (current === 'OPEN') return 'Start work';
    if (current === 'IN_PROGRESS') return 'Mark resolved';
    return null;
}
