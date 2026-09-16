import { Stack, Badge, RingProgress, Text, Blockquote, Button, Center } from '@mantine/core';
import { IconCheck, IconQuote } from '@tabler/icons-react';
import type { Feedback } from '@staylark/contract';
import { AudioPlayer } from '@/components/AudioPlayer/AudioPlayer';

const SENTIMENT_COLORS: Record<string, string> = {
    POSITIVE: 'green',
    NEUTRAL: 'gray',
    NEGATIVE: 'red'
};

interface FeedbackResultsProps {
    feedback: Feedback;
    onDone: () => void;
}

export function FeedbackResults({ feedback, onDone }: FeedbackResultsProps) {
    const scorePercent = feedback.score ? (feedback.score / 5) * 100 : 0;

    // Show the transcript itself (with the auto-transcribed disclaimer) rather than
    // the summary — our summary is extractive, so it's just a copy of the transcript's
    // opening sentences. Fall back to the summary only if there's no transcript.
    const recap = feedback.transcription ?? feedback.summary;

    return (
        <Stack gap='lg' py='md'>
            <Text size='lg' fw={600} ta='center'>
                Your Feedback Analysis
            </Text>

            {/* Sentiment Badge */}
            {feedback.sentiment && (
                <Center>
                    <Badge size='lg' color={SENTIMENT_COLORS[feedback.sentiment] ?? 'gray'} variant='light'>
                        {feedback.sentiment}
                    </Badge>
                </Center>
            )}

            {/* Score Ring */}
            {feedback.score && (
                <Center>
                    <RingProgress
                        size={100}
                        thickness={10}
                        roundCaps
                        sections={[{ value: scorePercent, color: 'brand' }]}
                        label={
                            <Text ta='center' fw={700} size='lg'>
                                {feedback.score}/5
                            </Text>
                        }
                    />
                </Center>
            )}

            {/* Recap (summary, or short transcript as fallback) */}
            {recap && (
                <div>
                    <Blockquote color='brand' icon={<IconQuote size={20} />}>
                        {recap}
                    </Blockquote>
                    {feedback.audioUrl && (
                        <Text size='xs' c='dimmed' ta='center' mt={6}>
                            Auto-transcribed from your recording — may contain minor errors.
                        </Text>
                    )}
                </div>
            )}

            {/* Original recording */}
            {feedback.audioUrl && <AudioPlayer src={feedback.audioUrl} label='Playback · Your recording' />}

            <Button
                fullWidth
                size='md'
                variant='light'
                leftSection={<IconCheck size={18} />}
                onClick={onDone}
                aria-label='Close feedback results'
            >
                Done
            </Button>
        </Stack>
    );
}
