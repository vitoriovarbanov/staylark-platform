import { Anchor, Group } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router';

/** "View all →" link used in dashboard section headers. */
export function ViewAllLink({ to }: { to: string }) {
    return (
        <Anchor component={Link} to={to} size='sm' fw={500}>
            <Group gap={4} wrap='nowrap'>
                View all
                <IconArrowRight size={14} />
            </Group>
        </Anchor>
    );
}
