import { Button, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useDisclosure, useReducedMotion } from '@mantine/hooks';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { motion, type Transition } from 'motion/react';
import { useMyProfile } from '@/hooks/api/use-my-profile';
import { ProfileHero } from './components/ProfileHero';
import { ProfileAbout } from './components/ProfileAbout';
import { JourneyRibbon } from './components/JourneyRibbon';
import { PassportStamps } from './components/PassportStamps';
import { RecentTrips } from './components/RecentTrips';
import { EditProfileModal } from './components/EditProfileModal';
import classes from './ProfilePage.module.css';

const STAGGER = 0.06;

function transition(index: number, reduced: boolean): Transition {
    return reduced ? { duration: 0 } : { duration: 0.45, delay: index * STAGGER, ease: 'easeOut' };
}

interface SectionTitleProps {
    children: string;
}

function SectionTitle({ children }: SectionTitleProps) {
    return (
        <Group gap={8}>
            <span className={classes.titleAccent} aria-hidden='true' />
            <Title order={2} className={classes.sectionTitle}>
                {children}
            </Title>
        </Group>
    );
}

function ProfileSkeleton() {
    return (
        <Stack gap='xl' maw={960} mx='auto'>
            <Skeleton height={240} radius='lg' />
            <Skeleton height={220} radius='lg' />
            <Skeleton height={360} radius='lg' />
            <Stack gap='sm'>
                <Skeleton height={28} width={180} radius='sm' />
                <Group gap='md' wrap='nowrap'>
                    <Skeleton height={200} radius='lg' style={{ flex: 1 }} />
                    <Skeleton height={200} radius='lg' style={{ flex: 1 }} />
                    <Skeleton height={200} radius='lg' style={{ flex: 1 }} />
                </Group>
            </Stack>
        </Stack>
    );
}

interface ProfileErrorProps {
    onRetry: () => void;
}

function ProfileError({ onRetry }: ProfileErrorProps) {
    return (
        <Stack maw={960} mx='auto'>
            <Paper withBorder radius='lg' p='xl'>
                <Stack align='center' gap='sm'>
                    <IconAlertTriangle size={36} stroke={1.6} color='var(--mantine-color-red-6)' />
                    <Title order={3} ff='Outfit' fw={700}>
                        We couldn&apos;t load your profile
                    </Title>
                    <Text c='dimmed' size='sm' ta='center'>
                        Something went wrong while fetching your travel profile. Please try again.
                    </Text>
                    <Button
                        variant='light'
                        color='brand'
                        leftSection={<IconRefresh size={16} stroke={1.8} />}
                        onClick={onRetry}
                        mt='xs'
                    >
                        Retry
                    </Button>
                </Stack>
            </Paper>
        </Stack>
    );
}

export function ProfilePage() {
    const { data, isLoading, isError, refetch } = useMyProfile();
    const [editOpen, { open, close }] = useDisclosure(false);
    const reduced = useReducedMotion() ?? false;

    if (isLoading) return <ProfileSkeleton />;
    if (isError || !data) return <ProfileError onRetry={() => void refetch()} />;

    const { profile, stats } = data;

    const block = (index: number) => ({
        initial: reduced ? false : { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: transition(index, reduced)
    });

    return (
        <>
            <Stack gap='xl' maw={960} mx='auto'>
                <motion.div {...block(0)}>
                    <ProfileHero stats={stats} profile={profile} onEdit={open} />
                </motion.div>

                <motion.div {...block(1)}>
                    <ProfileAbout profile={profile} />
                </motion.div>

                <motion.div {...block(2)}>
                    <Paper withBorder radius='lg' p='lg' className={classes.sectionCard}>
                        <Stack gap='md'>
                            <SectionTitle>Your journey</SectionTitle>
                            <JourneyRibbon journey={stats.journey} homeCity={profile.homeCity} />
                            <PassportStamps perCountry={stats.perCountry} />
                        </Stack>
                    </Paper>
                </motion.div>

                <motion.div {...block(3)}>
                    <Stack gap='md'>
                        <SectionTitle>Recent trips</SectionTitle>
                        <RecentTrips />
                    </Stack>
                </motion.div>
            </Stack>

            <EditProfileModal opened={editOpen} onClose={close} profile={profile} />
        </>
    );
}
