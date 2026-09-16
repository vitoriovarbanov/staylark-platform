import { SimpleGrid, Skeleton, Stack } from '@mantine/core';

export function OverviewSkeleton() {
    return (
        <Stack gap='md'>
            <SimpleGrid cols={{ base: 2, md: 6 }} spacing='md'>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={90} radius='md' />
                ))}
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md'>
                <Skeleton height={200} radius='md' />
                <Skeleton height={200} radius='md' />
            </SimpleGrid>
            <Skeleton height={240} radius='md' />
        </Stack>
    );
}
