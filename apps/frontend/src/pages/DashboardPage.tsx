import { Title, Text, Stack, Paper, Group, SimpleGrid, ThemeIcon } from '@mantine/core';
import { IconBuilding, IconCalendar, IconStar, IconTrendingUp } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { useStaggerAnimation } from '@/hooks/useStaggerAnimation';
import animationClasses from '@/styles/animations.module.css';

interface StatCardProps {
    index: number;
    label: string;
    value: string;
    icon: React.FC<{ size?: number; stroke?: number }>;
    accent?: boolean;
}

function StatCard({ index, label, value, icon: Icon, accent }: StatCardProps) {
    const animation = useStaggerAnimation(index);

    return (
        <motion.div {...animation}>
            <Paper
                p='lg'
                className={animationClasses.cardHover}
                style={accent ? { borderLeft: '3px solid var(--mantine-color-amber-5)' } : undefined}
            >
                <Group justify='space-between' align='flex-start'>
                    <Stack gap={4}>
                        <Text size='sm' c='var(--mantine-other-text-secondary)' fw={500}>
                            {label}
                        </Text>
                        <Title order={2} fw={700}>
                            {value}
                        </Title>
                    </Stack>
                    <ThemeIcon size='lg' radius='md' variant='light' color={accent ? 'amber' : 'brand'}>
                        <Icon size={20} stroke={1.5} />
                    </ThemeIcon>
                </Group>
            </Paper>
        </motion.div>
    );
}

const stats = [
    { label: 'Properties', value: '24', icon: IconBuilding },
    { label: 'Active Bookings', value: '8', icon: IconCalendar },
    { label: 'Avg. Rating', value: '4.8', icon: IconStar, accent: true },
    { label: 'Revenue', value: '$12.4k', icon: IconTrendingUp }
];

export function DashboardPage() {
    return (
        <Stack gap='lg'>
            <Stack gap={4}>
                <Title order={2}>Dashboard</Title>
                <Text c='var(--mantine-other-text-secondary)' size='sm'>
                    Overview of your property portfolio
                </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
                {stats.map((stat, index) => (
                    <StatCard key={stat.label} index={index} {...stat} />
                ))}
            </SimpleGrid>
        </Stack>
    );
}
