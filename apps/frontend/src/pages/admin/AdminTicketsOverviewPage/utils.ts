import type { TicketPriority, TicketCategory } from '@staylark/contract';

/** Mantine color token for a priority (chart + badge) */
export function priorityColor(p: TicketPriority): string {
    if (p === 'CRITICAL') return 'red.7';
    if (p === 'HIGH') return 'orange.6';
    if (p === 'MEDIUM') return 'yellow.6';
    return 'gray.5'; // LOW
}

/** Mantine color token for a category (chart) */
export function categoryColor(c: TicketCategory): string {
    const map: Record<TicketCategory, string> = {
        EMERGENCY: 'red.7',
        DAMAGE: 'orange.6',
        UTILITIES: 'blue.6',
        NOISE: 'grape.6',
        CLEANLINESS: 'teal.6',
        DELIVERY: 'gray.6'
    };
    return map[c];
}

/** "—" for null, else compact human duration: 45m / 2.5h / 3d 4h */
export function formatResolutionHours(hours: number | null): string {
    if (hours === null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    // Round to whole hours first, then split — rounding the remainder
    // independently could yield 24 (e.g. 47.6h → "1d 24h" instead of "2d").
    const totalHours = Math.round(hours);
    const days = Math.floor(totalHours / 24);
    const rem = totalHours % 24;
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

/** TitleCase an enum value: IN_PROGRESS → In Progress */
export function titleCase(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
