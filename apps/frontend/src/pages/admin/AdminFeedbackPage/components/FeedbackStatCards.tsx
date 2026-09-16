import { Box, Group, Paper, RingProgress, SimpleGrid, Stack, Text } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import type { FeedbackAggregation } from '@staylark/contract';
import { scoreRingColor, formatPercent, buildDelta, daysToFeedbackLabel } from '../utils';
import { StatTile } from './StatTile';

interface Props {
    aggregation: FeedbackAggregation;
}

export function FeedbackStatCards({ aggregation }: Props) {
    const prev = aggregation.previous;
    // Average Score and Negative Rate are feedback-content metrics: comparing them against a
    // prior window that had zero feedback produces a misleading delta (e.g. "▲ 4.0" purely
    // because the prior average was 0). Only show those deltas when the prior window actually
    // had feedback. Total and Response Rate remain meaningful even from a zero baseline.
    const hasPrevFeedback = !!prev && prev.totalCount > 0;

    const totalDelta = prev ? buildDelta(aggregation.totalCount - prev.totalCount, { upIsGood: true }) : undefined;

    const scoreDelta = hasPrevFeedback
        ? buildDelta(aggregation.averageScore - prev.averageScore, { upIsGood: true, decimals: 1 })
        : undefined;

    const responseDelta =
        prev && prev.responseRate !== null && aggregation.responseRate !== null
            ? buildDelta(aggregation.responseRate - prev.responseRate, { upIsGood: true, percent: true })
            : undefined;

    const negativeDelta = hasPrevFeedback
        ? buildDelta(aggregation.negativeRate - prev.negativeRate, { upIsGood: false, percent: true })
        : undefined;

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing='md'>
            <StatTile
                label='Total Feedback'
                value={aggregation.totalCount}
                sub='in selected period'
                delta={totalDelta}
            />

            <StatTile
                label='Response Rate'
                value={aggregation.responseRate !== null ? formatPercent(aggregation.responseRate) : '—'}
                valueTooltip={aggregation.responseRate === null ? 'No completed stays in this period' : undefined}
                sub={`${aggregation.completedBookings} stays completed this period`}
                delta={responseDelta}
            />

            <StatTile
                label='Average Score'
                value={aggregation.averageScore > 0 ? aggregation.averageScore.toFixed(1) : 'N/A'}
                sub='out of 5'
                delta={scoreDelta}
                accessory={
                    aggregation.averageScore > 0 ? (
                        <RingProgress
                            size={72}
                            thickness={8}
                            sections={[
                                {
                                    value: (aggregation.averageScore / 5) * 100,
                                    color: scoreRingColor(aggregation.averageScore)
                                }
                            ]}
                        />
                    ) : undefined
                }
            />

            <StatTile
                label='Negative Rate'
                value={formatPercent(aggregation.negativeRate)}
                sub={`${aggregation.sentimentBreakdown.NEGATIVE} negative of ${aggregation.totalCount}`}
                delta={negativeDelta}
            />

            <StatTile
                label='Voice vs Text'
                value={`${aggregation.voiceCount} / ${aggregation.textCount}`}
                sub='voice / text submissions'
            />

            <StatTile
                label='Avg Days to Feedback'
                value={daysToFeedbackLabel(aggregation.avgDaysToFeedback)}
                sub='from checkout to submission'
            />

            <SentimentSplitTile aggregation={aggregation} />
        </SimpleGrid>
    );
}

/** Sentiment split donut with a count/percentage legend. */
function SentimentSplitTile({ aggregation }: Props) {
    const sentimentData = [
        {
            name: 'Positive',
            value: aggregation.sentimentBreakdown.POSITIVE,
            color: 'green.6',
            swatch: 'var(--mantine-color-green-6)'
        },
        {
            name: 'Neutral',
            value: aggregation.sentimentBreakdown.NEUTRAL,
            color: 'gray.5',
            swatch: 'var(--mantine-color-gray-5)'
        },
        {
            name: 'Negative',
            value: aggregation.sentimentBreakdown.NEGATIVE,
            color: 'red.6',
            swatch: 'var(--mantine-color-red-6)'
        }
    ];
    const total = sentimentData.reduce((sum, s) => sum + s.value, 0);

    return (
        <Paper p='md' radius='md' withBorder>
            <Stack gap='xs'>
                <Text size='sm' c='dimmed' fw={500}>
                    Sentiment Split
                </Text>
                <Group justify='center' align='center' gap='lg' wrap='wrap'>
                    <DonutChart
                        size={120}
                        thickness={18}
                        withTooltip
                        data={sentimentData.map(({ name, value, color }) => ({
                            name,
                            value,
                            color
                        }))}
                    />
                    <Stack gap={6} style={{ flexShrink: 0 }}>
                        {sentimentData.map(s => {
                            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                            return (
                                <Group key={s.name} gap='xs' wrap='nowrap'>
                                    <Box
                                        w={10}
                                        h={10}
                                        style={{
                                            borderRadius: 2,
                                            background: s.swatch,
                                            flexShrink: 0
                                        }}
                                    />
                                    <Text size='xs' c='dimmed' style={{ minWidth: 56 }}>
                                        {s.name}
                                    </Text>
                                    <Text size='xs' fw={600}>
                                        {s.value}
                                    </Text>
                                    <Text size='xs' c='dimmed'>
                                        ({pct}%)
                                    </Text>
                                </Group>
                            );
                        })}
                    </Stack>
                </Group>
            </Stack>
        </Paper>
    );
}
