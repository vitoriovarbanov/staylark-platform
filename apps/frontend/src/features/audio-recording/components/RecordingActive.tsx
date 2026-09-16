import { Stack, ActionIcon, Text } from '@mantine/core';
import { IconPlayerStop } from '@tabler/icons-react';
import classes from './Recording.module.css';

interface RecordingActiveProps {
    elapsed: number;
    maxDuration: number;
    onStop: () => void;
    stopAriaLabel?: string;
    hint?: string;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function RecordingActive({
    elapsed,
    maxDuration,
    onStop,
    stopAriaLabel = 'Stop recording',
    hint = 'Tap to stop'
}: RecordingActiveProps) {
    return (
        <Stack align='center' gap='md' py='xl'>
            <ActionIcon
                size={80}
                radius='xl'
                color='red'
                variant='filled'
                onClick={onStop}
                aria-label={stopAriaLabel}
                className={classes.micButtonPulsing}
            >
                <IconPlayerStop size={36} />
            </ActionIcon>

            <Text size='lg' fw={600} ff='monospace'>
                {formatTime(elapsed)} / {formatTime(maxDuration)}
            </Text>

            <Text size='sm' c='dimmed'>
                {hint}
            </Text>
        </Stack>
    );
}
