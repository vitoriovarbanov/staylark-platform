import { Grid, SimpleGrid, Skeleton, Stack } from '@mantine/core';

/** Loading skeleton matching the dashboard layout (stat tiles + charts + entries). */
export function DashboardSkeleton() {
    return (
        <Stack gap='lg'>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing='md'>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} h={110} radius='md' />
                ))}
            </SimpleGrid>
            <Grid gutter='md'>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Skeleton h={300} radius='md' />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Skeleton h={300} radius='md' />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Skeleton h={260} radius='md' />
                </Grid.Col>
            </Grid>
            <Skeleton h={240} radius='md' />
        </Stack>
    );
}
