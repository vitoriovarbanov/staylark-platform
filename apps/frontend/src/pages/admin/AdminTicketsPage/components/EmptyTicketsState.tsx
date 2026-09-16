import { IconTicketOff } from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';

interface EmptyTicketsStateProps {
    hasFilters: boolean;
}

export function EmptyTicketsState({ hasFilters }: EmptyTicketsStateProps) {
    return (
        <EmptyState
            variant='compact'
            icon={IconTicketOff}
            title={hasFilters ? 'No tickets match these filters.' : 'Inbox clear — no problems reported.'}
            body={hasFilters ? 'Try adjusting or clearing the filters.' : undefined}
        />
    );
}
