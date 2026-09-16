import { Grid, Skeleton, Stack } from '@mantine/core';

export function DashboardSkeleton() {
    return (
        <Stack gap='lg'>
            {/* CommandDeck band */}
            <Skeleton height={172} radius='lg' />
            <Skeleton height={324} radius='md' />
            <Skeleton height={300} radius='md' />
            <Grid gutter='lg'>
                <Grid.Col span={{ base: 12, lg: 6 }}>
                    <Skeleton height={260} radius='md' />
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 6 }}>
                    <Skeleton height={260} radius='md' />
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
