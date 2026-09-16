import {
    ActionIcon,
    Alert,
    Card,
    Code,
    CopyButton,
    Group,
    Progress,
    Skeleton,
    Stack,
    Text,
    Tooltip
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useModelMetadata } from '@/hooks/admin-pricing/use-model-metadata';

dayjs.extend(relativeTime);

const DATE_FORMAT = 'D MMM YYYY HH:mm';

export function ModelTab() {
    const { data, isLoading, isError, error, refetch } = useModelMetadata();

    if (isLoading) {
        return <Skeleton height={220} radius='md' />;
    }

    if (isError || !data) {
        const message =
            (error &&
                typeof error === 'object' &&
                'message' in error &&
                String((error as { message: unknown }).message)) ||
            'Failed to load model metadata.';
        return (
            <Alert color='red' icon={<IconAlertTriangle size={16} />} title='Could not load model'>
                <Stack gap='xs'>
                    <Text size='sm'>{message}</Text>
                    <Text
                        component='button'
                        size='sm'
                        c='blue'
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => refetch()}
                    >
                        Retry
                    </Text>
                </Stack>
            </Alert>
        );
    }

    // Fail safe: anything that isn't explicitly 'real' (incl. a legacy model file
    // missing dataSource) is treated as synthetic, so the advisory banner is shown
    // rather than silently hidden on an unlabeled model.
    const isSynthetic = data.dataSource !== 'real';
    const trainedAt = dayjs(data.trainedAt);
    const rSquaredPercent = data.rSquared * 100;
    const rSquaredColor = data.rSquared >= 0.7 ? 'green' : data.rSquared >= 0.4 ? 'yellow' : 'red';

    return (
        <Stack gap='md'>
            {isSynthetic && (
                <Alert color='yellow' icon={<IconAlertTriangle size={16} />}>
                    Current model is trained on synthetic data. Predictions are advisory until real booking history
                    accumulates.
                </Alert>
            )}

            <Card withBorder radius='md' padding='lg'>
                <Stack gap='md'>
                    <Group justify='space-between' align='flex-start'>
                        <Stack gap={2}>
                            <Text size='sm' c='dimmed'>
                                Model version
                            </Text>
                            <Group gap='xs'>
                                <Code>{data.modelVersion}</Code>
                                <CopyButton value={data.modelVersion}>
                                    {({ copied, copy }) => (
                                        <Tooltip label={copied ? 'Copied' : 'Copy'}>
                                            <ActionIcon variant='subtle' size='sm' onClick={copy}>
                                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Group>
                        </Stack>
                    </Group>

                    <Stack gap={2}>
                        <Text size='sm' c='dimmed'>
                            Trained at
                        </Text>
                        <Text>{trainedAt.format(DATE_FORMAT)}</Text>
                        <Text size='xs' c='dimmed'>
                            {trainedAt.fromNow()}
                        </Text>
                    </Stack>

                    <Stack gap={4}>
                        <Group justify='space-between'>
                            <Tooltip label='How well the model fits its training data. 1.0 = perfect, 0 = no signal.'>
                                <Text size='sm' c='dimmed' style={{ cursor: 'help' }}>
                                    R² (goodness of fit)
                                </Text>
                            </Tooltip>
                            <Text size='sm' fw={600}>
                                {data.rSquared.toFixed(3)}
                            </Text>
                        </Group>
                        <Progress value={rSquaredPercent} color={rSquaredColor} size='md' radius='xl' />
                    </Stack>

                    {data.note && (
                        <Text size='sm' c='dimmed' fs='italic'>
                            {data.note}
                        </Text>
                    )}
                </Stack>
            </Card>

            <Card withBorder radius='md' padding='lg'>
                <Stack gap='md'>
                    <Text fw={600}>Retraining</Text>
                    <Text size='sm' c='dimmed'>
                        The model gets better by being retrained on booking history. This is a periodic engineering
                        task, not a setting — there is nothing to run from this page.
                    </Text>

                    <Stack gap='sm'>
                        <Stack gap={2}>
                            <Text size='sm' c='dimmed'>
                                Current phase
                            </Text>
                            <Text size='sm'>
                                {isSynthetic
                                    ? 'Synthetic data — predictions are advisory until real bookings accumulate'
                                    : 'Trained on real booking history'}
                            </Text>
                        </Stack>

                        <Stack gap={2}>
                            <Text size='sm' c='dimmed'>
                                Who retrains
                            </Text>
                            <Text size='sm'>
                                The engineering team. Every retrain is reviewed before it goes live, so pricing changes
                                are never silent.
                            </Text>
                        </Stack>

                        <Stack gap={2}>
                            <Text size='sm' c='dimmed'>
                                When it happens
                            </Text>
                            <Text size='sm'>
                                Once enough real bookings accumulate (roughly 500+ across several properties and a few
                                months), then periodically as the platform grows.
                            </Text>
                        </Stack>

                        <Stack gap={2}>
                            <Text size='sm' c='dimmed'>
                                What you will notice
                            </Text>
                            <Text size='sm'>
                                The model version and “trained at” date update
                                {isSynthetic ? ', and the synthetic-data notice above disappears' : ''}.
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    );
}
