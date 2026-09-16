import { Accordion, Badge, Blockquote, Group, Stack, Text } from '@mantine/core';
import type { Feedback } from '@staylark/contract';
import dayjs from 'dayjs';
import { AudioPlayer } from '@/components/AudioPlayer/AudioPlayer';
import { sentimentBadgeColor, truncateWithEllipsis } from '../../utils';

const PREVIEW_MAX_LENGTH = 80;

function FeedbackEntryItem({ feedback: fb }: { feedback: Feedback }) {
    const preview = fb.transcription ? truncateWithEllipsis(fb.transcription, PREVIEW_MAX_LENGTH) : 'No transcription';

    return (
        <Accordion.Item value={fb.id}>
            <Accordion.Control>
                <Group justify='space-between' wrap='nowrap' gap='md'>
                    <Group gap='xs' wrap='nowrap'>
                        <Badge color={sentimentBadgeColor(fb.sentiment)}>{fb.sentiment ?? 'N/A'}</Badge>
                        <Text fw={500} size='sm'>
                            {fb.score ?? '-'}/5
                        </Text>
                    </Group>
                    <Text size='sm' c='dimmed' truncate style={{ flex: 1, minWidth: 0 }}>
                        {preview}
                    </Text>
                    <Text size='xs' c='dimmed' style={{ flexShrink: 0 }}>
                        {dayjs(fb.createdAt).format('MMM D, YYYY')}
                    </Text>
                </Group>
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap='sm'>
                    {fb.transcription ? (
                        <Blockquote color='blue' cite='Guest feedback'>
                            {fb.transcription}
                        </Blockquote>
                    ) : null}
                    {fb.topics && fb.topics.length > 0 ? (
                        <Group gap='xs'>
                            {fb.topics.map(t => (
                                <Badge key={t} variant='light'>
                                    {t}
                                </Badge>
                            ))}
                        </Group>
                    ) : null}
                    {fb.summary ? (
                        <Text size='sm' c='dimmed' fs='italic'>
                            {fb.summary}
                        </Text>
                    ) : null}
                    {fb.audioUrl ? <AudioPlayer src={fb.audioUrl} label='Recording' /> : null}
                    {!fb.transcription && !fb.summary && !fb.audioUrl && (!fb.topics || fb.topics.length === 0) && (
                        <Text size='sm' c='dimmed'>
                            No details available for this feedback entry.
                        </Text>
                    )}
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}

export { FeedbackEntryItem };
