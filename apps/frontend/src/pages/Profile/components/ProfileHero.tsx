import { ActionIcon, Avatar, Badge, Box, Button, Group, Stack, Text } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconCamera, IconPencil, IconPlus } from '@tabler/icons-react';
import { motion } from 'motion/react';
import dayjs from 'dayjs';
import type { MyProfileFields, TravelStats } from '@staylark/contract';
import { GeometricPattern } from '@/components/GeometricPattern/GeometricPattern';
import { useAuth } from '@/contexts/auth-context';
import classes from './ProfileHero.module.css';

interface ProfileHeroProps {
    stats: TravelStats;
    profile: MyProfileFields;
    onEdit: () => void;
}

interface StatTileProps {
    value: number;
    label: string;
    index: number;
    reduceMotion: boolean;
}

function StatTile({ value, label, index, reduceMotion }: StatTileProps) {
    return (
        <motion.div
            className={classes.statTile}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.15 + index * 0.08 }}
        >
            <span className={classes.statValue}>{value}</span>
            <span className={classes.statLabel}>{label}</span>
        </motion.div>
    );
}

export function ProfileHero({ stats, profile, onEdit }: ProfileHeroProps) {
    const { user } = useAuth();
    const reduceMotion = useReducedMotion();

    const name = user?.name ?? 'Traveller';
    const memberSince = user?.createdAt ? dayjs(user.createdAt).format('YYYY') : '—';
    const showRole = !!user && user.role !== 'USER';

    return (
        <Box className={classes.hero}>
            <GeometricPattern variant='grid' color='#ffffff' opacity={0.05} />
            <span className={classes.amberCorner} aria-hidden='true' />

            <div className={classes.content}>
                <div className={classes.identity}>
                    <div className={classes.avatarWrap}>
                        <Avatar
                            src={user?.image ?? undefined}
                            name={name}
                            size={96}
                            radius='50%'
                            color='amber'
                            className={classes.avatar}
                        />
                        <ActionIcon
                            className={classes.cameraBadge}
                            radius='xl'
                            size='md'
                            aria-label='Change profile photo'
                            onClick={onEdit}
                        >
                            <IconCamera size={15} stroke={1.8} />
                        </ActionIcon>
                    </div>

                    <Stack gap={4} className={classes.headings}>
                        <Group gap={8} justify='center' className={classes.nameRow}>
                            <Text component='h1' className={classes.name}>
                                {name}
                            </Text>
                            {showRole && (
                                <Badge color='amber' variant='light' radius='sm' size='sm'>
                                    {user.role}
                                </Badge>
                            )}
                        </Group>
                        <Text className={classes.subline}>
                            {profile.homeCity ?? '—'} Member since {memberSince}
                        </Text>

                        {profile.bio ? (
                            <Text className={classes.bio} lineClamp={2}>
                                {profile.bio}
                            </Text>
                        ) : (
                            <button type='button' className={classes.addBio} onClick={onEdit}>
                                <IconPlus size={14} stroke={2} />
                                Add a bio
                            </button>
                        )}
                    </Stack>
                </div>

                <div className={classes.stats}>
                    <StatTile value={stats.countries} label='Countries' index={0} reduceMotion={!!reduceMotion} />
                    <StatTile value={stats.cities} label='Cities' index={1} reduceMotion={!!reduceMotion} />
                    <StatTile value={stats.nights} label='Nights' index={2} reduceMotion={!!reduceMotion} />
                </div>
            </div>

            <Button
                className={classes.editBtn}
                variant='white'
                color='brand'
                radius='xl'
                size='sm'
                leftSection={<IconPencil size={15} stroke={1.8} />}
                onClick={onEdit}
            >
                Edit profile
            </Button>
        </Box>
    );
}
