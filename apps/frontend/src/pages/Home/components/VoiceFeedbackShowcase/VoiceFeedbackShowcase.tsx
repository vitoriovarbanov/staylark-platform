import { Container, Title, Text, Stack, Group } from '@mantine/core';
import { IconMicrophone, IconFileAnalytics, IconStars } from '@tabler/icons-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import classes from './VoiceFeedbackShowcase.module.css';

// Natural waveform envelope — peaks in the middle, tapers at edges
const WAVEFORM_BARS = [
    3, 6, 4, 10, 7, 16, 12, 22, 18, 28, 20, 32, 26, 36, 30, 38, 34, 28, 32, 24, 18, 26, 14, 20, 10, 14, 7, 10, 5, 3, 6,
    2
];

export function VoiceFeedbackShowcase() {
    const { ref, revealed } = useScrollReveal(0.25);

    return (
        <Container size='lg' py={80}>
            <div ref={ref} className={classes.section} data-revealed={revealed || undefined}>
                {/* ── Text Side ──────────────────────── */}
                <div className={classes.textSide}>
                    <Text className={classes.sectionLabel}>Voice feedback</Text>
                    <Title order={2} className={classes.heading}>
                        AI-Powered Voice Feedback
                    </Title>
                    <Text className={classes.description}>
                        Share your experience by simply speaking. Our AI transcribes your recording and extracts
                        sentiment, key topics, and an overall score — giving property managers actionable insight.
                    </Text>

                    <Stack gap='sm' mt='xl'>
                        <Group gap='sm' wrap='nowrap'>
                            <div className={classes.featureIcon}>
                                <IconMicrophone size={16} />
                            </div>
                            <Text size='sm' c='var(--mantine-color-gray-7)'>
                                Record directly in your browser
                            </Text>
                        </Group>
                        <Group gap='sm' wrap='nowrap'>
                            <div className={classes.featureIcon}>
                                <IconFileAnalytics size={16} />
                            </div>
                            <Text size='sm' c='var(--mantine-color-gray-7)'>
                                Automatic transcription &amp; sentiment analysis
                            </Text>
                        </Group>
                        <Group gap='sm' wrap='nowrap'>
                            <div className={classes.featureIcon}>
                                <IconStars size={16} />
                            </div>
                            <Text size='sm' c='var(--mantine-color-gray-7)'>
                                Topic extraction &amp; experience scoring
                            </Text>
                        </Group>
                    </Stack>
                </div>

                {/* ── Illustration Side ──────────────── */}
                <div className={classes.illustration}>
                    {/* Waveform */}
                    <div className={classes.waveformArea}>
                        <div className={classes.waveformLabel}>Recording</div>
                        <svg className={classes.waveformSvg} viewBox='0 0 192 80' preserveAspectRatio='xMidYMid meet'>
                            {WAVEFORM_BARS.map((h, i) => (
                                <rect
                                    key={i}
                                    x={i * 6}
                                    y={40 - h / 2}
                                    width={3.5}
                                    height={h}
                                    rx={1.5}
                                    fill='var(--mantine-color-brand-4)'
                                    className={classes.waveformBar}
                                    style={{ animationDelay: `${i * 0.03 + 0.2}s` }}
                                />
                            ))}
                        </svg>
                    </div>

                    {/* Flow connector */}
                    <div className={classes.flowConnector}>
                        <div className={classes.flowLine} />
                        <div className={classes.flowDot} />
                    </div>

                    {/* Results card */}
                    <div className={classes.resultCard}>
                        <div className={classes.resultCorner} data-position='top-left' />
                        <div className={classes.resultCorner} data-position='bottom-right' />
                        <div className={classes.resultLabel}>Analysis</div>

                        <div className={classes.sentimentRow}>
                            <span className={classes.sentimentDot} />
                            <span className={classes.sentimentText}>Positive</span>
                        </div>

                        <div className={classes.topicsRow}>
                            <span className={classes.topicTag}>Cleanliness</span>
                            <span className={classes.topicTag}>Location</span>
                            <span className={classes.topicTag}>WiFi</span>
                        </div>

                        <div className={classes.scoreRow}>
                            <span className={classes.scoreValue}>4.0</span>
                            <span className={classes.scoreLabel}>/5</span>
                            <div className={classes.scoreBar}>
                                <div className={classes.scoreBarFill} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}
