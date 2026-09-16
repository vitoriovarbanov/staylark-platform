import { Center, Paper, Stack, Text, Title } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import type { ScoreDistribution } from '@staylark/contract';

interface Props {
    distribution: ScoreDistribution;
}

/** Histogram of feedback counts at each 1–5 score. */
export function ScoreDistributionChart({ distribution }: Props) {
    const data = (['1', '2', '3', '4', '5'] as const).map(score => ({
        score: `${score}★`,
        count: distribution[score]
    }));
    const total = data.reduce((s, d) => s + d.count, 0);

    return (
        <Paper p='md' radius='md' withBorder>
            <Stack gap='sm'>
                <Title order={5}>Score Distribution</Title>
                <Text size='xs' c='dimmed'>
                    How many guests gave each score
                </Text>
                {total > 0 ? (
                    <BarChart
                        h={240}
                        data={data}
                        dataKey='score'
                        series={[{ name: 'count', color: 'blue.6' }]}
                        yAxisProps={{ allowDecimals: false }}
                        withTooltip
                        tickLine='y'
                        gridAxis='y'
                    />
                ) : (
                    <Center h={200}>
                        <Text c='dimmed' size='sm'>
                            No scored feedback yet
                        </Text>
                    </Center>
                )}
            </Stack>
        </Paper>
    );
}
