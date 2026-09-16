import { Stack, Button, Group } from '@mantine/core';
import { IconSend, IconRefresh } from '@tabler/icons-react';
import { AudioPlayer } from '@/components/AudioPlayer/AudioPlayer';

interface RecordingReviewProps {
    audioUrl: string | null;
    onReRecord: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    submitLabel?: string;
    submitAriaLabel?: string;
    reRecordLabel?: string;
}

export function RecordingReview({
    audioUrl,
    onReRecord,
    onSubmit,
    isSubmitting,
    submitLabel = 'Submit',
    submitAriaLabel,
    reRecordLabel = 'Re-record'
}: RecordingReviewProps) {
    return (
        <Stack gap='md' py='md'>
            {audioUrl && <AudioPlayer src={audioUrl} label='Playback · Your recording' />}

            <Group justify='center'>
                <Button
                    variant='subtle'
                    leftSection={<IconRefresh size={16} />}
                    onClick={onReRecord}
                    disabled={isSubmitting}
                >
                    {reRecordLabel}
                </Button>
            </Group>

            <Button
                fullWidth
                size='md'
                leftSection={<IconSend size={18} />}
                onClick={onSubmit}
                loading={isSubmitting}
                disabled={!audioUrl}
                aria-label={submitAriaLabel ?? submitLabel}
            >
                {submitLabel}
            </Button>
        </Stack>
    );
}
