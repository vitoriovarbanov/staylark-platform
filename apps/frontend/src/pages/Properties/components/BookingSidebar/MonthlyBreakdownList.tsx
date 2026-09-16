import { Group, Stack, Text } from '@mantine/core';
import type { BillingPeriod } from '@/lib/billing-periods';

interface MonthlyBreakdownListProps {
    periods: BillingPeriod[];
}

/**
 * Renders one row per anchored billing period (Month 1, Month 2, …) with its
 * date range, night count, average nightly price, and subtotal. The overall
 * total and any duration discount are rendered by the caller (unchanged).
 */
export function MonthlyBreakdownList({ periods }: MonthlyBreakdownListProps) {
    return (
        <Stack gap='xs'>
            {periods.map((period, i) => (
                <Group key={period.periodStart} justify='space-between' align='flex-start' wrap='nowrap'>
                    <Stack gap={0}>
                        <Text size='sm' fw={500}>
                            Month {i + 1}
                        </Text>
                        <Text size='xs' c='dimmed'>
                            {period.label} · {period.nights} nights · &euro;{period.avgPerNight.toFixed(2)}/night
                        </Text>
                    </Stack>
                    <Text size='sm'>&euro;{period.subtotal.toFixed(2)}</Text>
                </Group>
            ))}
        </Stack>
    );
}
