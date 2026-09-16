import { Badge, Box, Center, Grid, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { BarChart, LineChart } from '@mantine/charts';
import dayjs from 'dayjs';
import type { FeedbackAggregation } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { formatTopic, sentimentMantineColor, truncateWithEllipsis } from '../utils';
import { ScoreDistributionChart } from './ScoreDistributionChart';

const MAX_TOPIC_LABEL_LENGTH = 14;
const SCROLLABLE_WEEK_THRESHOLD = 8;
const MIN_BAR_WIDTH_PX = 80;

const SENTIMENT_SERIES = [
    { name: 'Positive', color: 'green.6' },
    { name: 'Neutral', color: 'gray.5' },
    { name: 'Negative', color: 'red.6' }
] as const;

const SENTIMENT_LEGEND = [
    { label: 'positive', color: 'green' },
    { label: 'neutral', color: 'gray' },
    { label: 'negative', color: 'red' }
] as const;

interface Props {
    aggregation: FeedbackAggregation;
}

function EmptyChart({ message }: { message: string }) {
    return (
        <Center h={200}>
            <EmptyState variant='compact' title={message} />
        </Center>
    );
}

export function FeedbackChartsRow({ aggregation }: Props) {
    const weekCount = aggregation.feedbackOverTime.length;
    const isScrollable = weekCount > SCROLLABLE_WEEK_THRESHOLD;

    const timeChartData = aggregation.feedbackOverTime.map(d => {
        const start = dayjs(d.period);
        const end = start.add(6, 'day');
        const label =
            start.month() === end.month()
                ? `${start.format('MMM D')}-${end.format('D')}`
                : `${start.format('MMM D')}-${end.format('MMM D')}`;
        return {
            week: label,
            Positive: d.positive,
            Neutral: d.neutral,
            Negative: d.negative,
            'Avg Score': d.averageScore
        };
    });

    const topicData = aggregation.topTopics.map(t => ({
        topic: truncateWithEllipsis(formatTopic(t.topic), MAX_TOPIC_LABEL_LENGTH),
        fullTopic: formatTopic(t.topic),
        count: t.count,
        color: sentimentMantineColor(t.dominantSentiment)
    }));
    const topicChartHeight = Math.max(200, topicData.length * 40 + 40);

    const timeChartSpan = isScrollable ? 12 : 7;
    const topicChartSpan = isScrollable ? 12 : 5;

    const timeChart = (
        <BarChart
            h={isScrollable ? 320 : 260}
            data={timeChartData}
            dataKey='week'
            type='stacked'
            series={[...SENTIMENT_SERIES]}
            yAxisProps={{ allowDecimals: false }}
            {...(isScrollable
                ? {
                      xAxisProps: { angle: -45, textAnchor: 'end', height: 80, interval: 0 }
                  }
                : { withLegend: true })}
            withTooltip
            tickLine='y'
            gridAxis='y'
        />
    );

    const scoreTrendChart =
        timeChartData.length > 0 ? (
            <Stack gap={4}>
                <Text size='xs' c='dimmed' fw={500}>
                    Average score trend
                </Text>
                <LineChart
                    h={140}
                    data={timeChartData}
                    dataKey='week'
                    series={[{ name: 'Avg Score', color: 'blue.6' }]}
                    yAxisProps={{ domain: [0, 5] }}
                    withTooltip
                    curveType='monotone'
                    connectNulls
                />
            </Stack>
        ) : null;

    return (
        <Grid gutter='md'>
            <Grid.Col span={{ base: 12, md: timeChartSpan }}>
                <Paper p='md' radius='md' withBorder>
                    <Stack gap='sm'>
                        <Title order={5}>Feedback Over Time</Title>
                        <Text size='xs' c='dimmed'>
                            Weekly volume by sentiment, with average-score trend
                        </Text>
                        {timeChartData.length > 0 ? (
                            isScrollable ? (
                                <>
                                    <Group gap='md' justify='center'>
                                        {SENTIMENT_LEGEND.map(s => (
                                            <Group gap={6} key={s.label}>
                                                <Box
                                                    w={12}
                                                    h={12}
                                                    style={{
                                                        borderRadius: 2,
                                                        background: `var(--mantine-color-${s.color}-6)`
                                                    }}
                                                />
                                                <Text size='xs'>{s.label[0].toUpperCase() + s.label.slice(1)}</Text>
                                            </Group>
                                        ))}
                                    </Group>
                                    <Box style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                                        <Box style={{ minWidth: weekCount * MIN_BAR_WIDTH_PX }}>{timeChart}</Box>
                                    </Box>
                                    {scoreTrendChart}
                                </>
                            ) : (
                                <>
                                    {timeChart}
                                    {scoreTrendChart}
                                </>
                            )
                        ) : (
                            <EmptyChart message='Not enough data for a trend' />
                        )}
                    </Stack>
                </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: topicChartSpan }}>
                <Paper p='md' radius='md' withBorder>
                    <Stack gap='sm'>
                        <Title order={5}>What Guests Talk About</Title>
                        {topicData.length > 0 ? (
                            <>
                                <BarChart
                                    h={topicChartHeight}
                                    data={topicData}
                                    dataKey='topic'
                                    orientation='vertical'
                                    yAxisProps={{
                                        width: 110,
                                        tick: ({
                                            x,
                                            y,
                                            payload
                                        }: {
                                            x: number;
                                            y: number;
                                            payload: { value: string };
                                        }) => {
                                            const fullName =
                                                topicData.find(t => t.topic === payload.value)?.fullTopic ??
                                                payload.value;
                                            const isTruncated = fullName !== payload.value;
                                            const textEl = (
                                                <text
                                                    x={x}
                                                    y={y}
                                                    dy={4}
                                                    textAnchor='end'
                                                    fontSize={12}
                                                    fill='var(--mantine-color-text)'
                                                >
                                                    {payload.value}
                                                </text>
                                            );
                                            return isTruncated ? (
                                                <Tooltip label={fullName} position='left' withArrow>
                                                    {textEl}
                                                </Tooltip>
                                            ) : (
                                                textEl
                                            );
                                        }
                                    }}
                                    xAxisProps={{ allowDecimals: false }}
                                    series={[{ name: 'count', color: 'blue.6' }]}
                                    tickLine='none'
                                    gridAxis='x'
                                    withTooltip
                                />
                                <Group gap='xs' mt='xs'>
                                    {SENTIMENT_LEGEND.map(s => (
                                        <Badge key={s.label} color={s.color} variant='light' size='xs'>
                                            {s.label}
                                        </Badge>
                                    ))}
                                </Group>
                            </>
                        ) : (
                            <EmptyChart message='No topics extracted yet' />
                        )}
                    </Stack>
                </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12 }}>
                <ScoreDistributionChart distribution={aggregation.scoreDistribution} />
            </Grid.Col>
        </Grid>
    );
}
