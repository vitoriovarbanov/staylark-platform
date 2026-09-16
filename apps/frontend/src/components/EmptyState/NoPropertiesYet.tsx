import { Button } from '@mantine/core';
import { Link } from 'react-router';
import { IconBuildingOff } from '@tabler/icons-react';
import { EmptyState } from './EmptyState';

/**
 * Shown on every manager screen that derives from their portfolio — dashboard,
 * bookings, tickets, feedback, pricing — when they manage nothing yet.
 *
 * Without it these pages render as empty tables, which reads as "broken" rather
 * than "nothing here yet". Managers create their own properties, so the way out
 * is a link, not a request to an admin.
 */
export function NoPropertiesYet({ what }: { what: string }) {
    return (
        <EmptyState
            variant='compact'
            icon={IconBuildingOff}
            title='No properties yet'
            body={`Create your first property and ${what} will appear here.`}
            action={
                <Button component={Link} to='/admin/properties' variant='light'>
                    Go to Properties
                </Button>
            }
        />
    );
}
