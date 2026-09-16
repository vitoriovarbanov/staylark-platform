import { Badge } from '@mantine/core';
import type { TicketCategory } from '@staylark/contract';
import { IconAlertOctagon, IconHammer, IconPackage, IconSparkles, IconBolt, IconVolume } from '@tabler/icons-react';
import { CATEGORY_LABELS } from '../utils/routing-labels';

interface CategoryBadgeProps {
    category: TicketCategory | null;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

const CATEGORY_ICONS: Record<TicketCategory, typeof IconVolume> = {
    NOISE: IconVolume,
    DAMAGE: IconHammer,
    CLEANLINESS: IconSparkles,
    DELIVERY: IconPackage,
    UTILITIES: IconBolt,
    EMERGENCY: IconAlertOctagon
};

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
    if (!category) {
        return (
            <Badge color='gray' size={size} variant='light' radius='sm'>
                Pending review
            </Badge>
        );
    }
    const Icon = CATEGORY_ICONS[category];
    return (
        <Badge
            color={category === 'EMERGENCY' ? 'red' : 'brand'}
            size={size}
            variant='light'
            radius='sm'
            leftSection={<Icon size={12} stroke={2} />}
        >
            {CATEGORY_LABELS[category]}
        </Badge>
    );
}
