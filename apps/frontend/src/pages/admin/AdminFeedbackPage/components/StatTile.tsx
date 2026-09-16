import { Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';

interface StatTileProps {
    label: string;
    value: ReactNode;
    /** When set, the value gets a hover tooltip — useful to explain a "—" placeholder. */
    valueTooltip?: string;
    sub?: string;
    delta?: { text: string; color: string };
    accessory?: ReactNode;
}

/** A single dashboard stat tile with an optional period-over-period delta chip. */
export function StatTile({ label, value, valueTooltip, sub, delta, accessory }: StatTileProps) {
    return (
        <Paper p='md' radius='md' withBorder>
            <Group justify='space-between' align='flex-start' wrap='nowrap'>
                <Stack gap={4} style={{ minWidth: 0 }}>
                    <Text size='sm' c='dimmed' fw={500}>
                        {label}
                    </Text>
                    <Tooltip label={valueTooltip} disabled={!valueTooltip} withArrow>
                        <Text size='2rem' fw={700} lh={1} w='fit-content'>
                            {value}
                        </Text>
                    </Tooltip>
                    {delta && (
                        <Text size='xs' fw={600} c={delta.color}>
                            {delta.text}{' '}
                            <Text span size='xs' c='dimmed' fw={400}>
                                vs prev period
                            </Text>
                        </Text>
                    )}
                    {sub && (
                        <Text size='xs' c='dimmed'>
                            {sub}
                        </Text>
                    )}
                </Stack>
                {accessory}
            </Group>
        </Paper>
    );
}
