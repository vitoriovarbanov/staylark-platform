import { Alert, Button, Grid, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { useAdminStats } from '@/hooks/api/use-admin-stats';
import { useAdminPropertyStats } from '@/hooks/api/use-admin-property-stats';
import { prefersReducedMotion, staggered } from '@/pages/Bookings/utils/bookings.utils';
import { CommandDeck } from './components/CommandDeck';
import { OccupancyChart } from './components/OccupancyChart';
import { PropertyStatsTable } from './components/PropertyStatsTable';
import { RecentBookingsTable } from './components/RecentBookingsTable';
import { CriticalTicketsTable } from './components/CriticalTicketsTable';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { NoPropertiesYet } from '@/components/EmptyState/NoPropertiesYet';

export function AdminDashboardPage() {
    const statsQuery = useAdminStats();
    const stats = statsQuery.data?.data;
    const propertyStatsQuery = useAdminPropertyStats();
    const propertyStats = propertyStatsQuery.data?.data ?? [];

    const reduced = prefersReducedMotion();
    // CommandDeck self-animates at delay 0; the panels below cascade after it.
    const reveal = (delay: number) => ({
        initial: reduced ? false : { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: staggered(delay, reduced)
    });

    return (
        <Stack gap='lg'>
            <PageHeader title='Dashboard' subtitle='KPIs across the properties you manage' />

            {statsQuery.isLoading ? (
                <DashboardSkeleton />
            ) : statsQuery.isError ? (
                <Alert color='red' icon={<IconAlertTriangle size={18} />} title='Failed to load dashboard'>
                    <Group justify='space-between'>
                        <Text size='sm'>Something went wrong while loading the stats.</Text>
                        <Button size='xs' variant='light' onClick={() => statsQuery.refetch()}>
                            Retry
                        </Button>
                    </Group>
                </Alert>
            ) : stats && stats.totals.properties === 0 ? (
                // Every figure on this page derives from the manager's portfolio, so
                // with none the charts render as empty axes rather than "nothing yet".
                <NoPropertiesYet what='your KPIs' />
            ) : stats ? (
                <>
                    <CommandDeck totals={stats.totals} />
                    <motion.div {...reveal(0.5)}>
                        <OccupancyChart data={stats.occupancyTrend} />
                    </motion.div>
                    <motion.div {...reveal(0.58)}>
                        <PropertyStatsTable properties={propertyStats} isLoading={propertyStatsQuery.isLoading} />
                    </motion.div>
                    <motion.div {...reveal(0.66)}>
                        <Grid gutter='lg'>
                            <Grid.Col span={{ base: 12, lg: 6 }}>
                                <RecentBookingsTable bookings={stats.recentBookings} />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, lg: 6 }}>
                                <CriticalTicketsTable tickets={stats.criticalTickets} />
                            </Grid.Col>
                        </Grid>
                    </motion.div>
                </>
            ) : null}
        </Stack>
    );
}
