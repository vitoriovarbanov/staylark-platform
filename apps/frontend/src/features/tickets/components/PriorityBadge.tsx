import { Badge } from '@mantine/core';
import type { TicketPriority } from '@staylark/contract';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../utils/routing-labels';

interface PriorityBadgeProps {
    priority: TicketPriority;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    variant?: 'light' | 'filled' | 'outline';
}

export function PriorityBadge({ priority, size = 'sm', variant = 'light' }: PriorityBadgeProps) {
    return (
        <Badge color={PRIORITY_COLORS[priority]} size={size} variant={variant} radius='sm'>
            {PRIORITY_LABELS[priority]}
        </Badge>
    );
}
