import { Link } from 'react-router';
import { Button } from '@mantine/core';
import { IconArrowRight, IconPlaneDeparture } from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';

export function EmptyBookings() {
    return (
        <EmptyState
            icon={IconPlaneDeparture}
            eyebrow='NO BOOKINGS YET'
            title='Your next journey starts here.'
            body='Your upcoming, active, and past stays will appear here once you book your first place.'
            action={
                <Button
                    component={Link}
                    to='/properties'
                    variant='filled'
                    color='amber'
                    rightSection={<IconArrowRight size={16} />}
                >
                    Browse properties
                </Button>
            }
        />
    );
}
