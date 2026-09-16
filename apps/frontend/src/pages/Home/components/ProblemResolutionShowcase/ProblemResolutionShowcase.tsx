import { Container, Title, Text } from '@mantine/core';
import { IconMicrophone, IconCpu, IconCheck, IconVolume, IconTag, IconArrowsShuffle } from '@tabler/icons-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import classes from './ProblemResolutionShowcase.module.css';

export function ProblemResolutionShowcase() {
    const { ref, revealed } = useScrollReveal(0.25);

    return (
        <Container size='lg' py={96}>
            <div ref={ref} className={classes.section} data-revealed={revealed || undefined}>
                {/* ── Intro (centered) ───────────────── */}
                <div className={classes.intro}>
                    <Text className={classes.sectionLabel}>Problem resolution</Text>
                    <Title order={2} className={classes.heading}>
                        Intelligent Problem Resolution
                    </Title>
                    <Text className={classes.description}>
                        Report issues by voice. AI classifies the problem, assigns priority, and routes it to the right
                        team — automatically. No forms, no waiting.
                    </Text>
                </div>

                {/* ── Illustration (full-width pipeline) ── */}
                <div className={classes.illustration}>
                    <div className={classes.pipelineCard}>
                        <div className={classes.scanlines} />

                        <div className={classes.pipeline}>
                            {/* Node 1: REPORTED */}
                            <div className={classes.pipelineNode}>
                                <div className={classes.nodeCircle} data-stage='reported'>
                                    <IconMicrophone size={18} />
                                </div>
                                <span className={classes.nodeLabel}>REPORTED</span>
                                <span className={classes.nodeDetail}>Voice recorded</span>
                            </div>

                            {/* Connector 1→2 */}
                            <div className={classes.connector}>
                                <div className={classes.connectorLine} />
                                <div className={classes.connectorDot} />
                            </div>

                            {/* Node 2: ANALYZING */}
                            <div className={classes.pipelineNode}>
                                <div className={classes.nodeCircle} data-stage='analyzing'>
                                    <IconCpu size={18} />
                                </div>
                                <span className={classes.nodeLabel}>ANALYZING</span>
                                <span className={classes.nodeDetail}>category: PLUMBING</span>
                                <span className={classes.nodeDetail}>priority: HIGH</span>
                            </div>

                            {/* Connector 2→3 */}
                            <div className={classes.connector}>
                                <div className={classes.connectorLine} />
                                <div className={classes.connectorDot} />
                            </div>

                            {/* Node 3: RESOLVED */}
                            <div className={classes.pipelineNode}>
                                <div className={classes.nodeCircle} data-stage='resolved'>
                                    <IconCheck size={18} />
                                </div>
                                <span className={classes.nodeLabel}>RESOLVED</span>
                                <span className={classes.nodeDetail}>Routed to: Maintenance</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Capabilities (3-up under the pipeline) ── */}
                <div className={classes.featureRow}>
                    <div className={classes.featureItem}>
                        <div className={classes.featureIcon}>
                            <IconVolume size={18} />
                        </div>
                        <Text className={classes.featureLabel}>Voice-first problem reporting</Text>
                    </div>
                    <div className={classes.featureItem}>
                        <div className={classes.featureIcon}>
                            <IconTag size={18} />
                        </div>
                        <Text className={classes.featureLabel}>AI classification &amp; priority</Text>
                    </div>
                    <div className={classes.featureItem}>
                        <div className={classes.featureIcon}>
                            <IconArrowsShuffle size={18} />
                        </div>
                        <Text className={classes.featureLabel}>Automatic routing to the right team</Text>
                    </div>
                </div>
            </div>
        </Container>
    );
}
