import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { TICKET_EVENT, type TicketEvent } from '@staylark/contract';
import { useAuth } from '@/contexts/auth-context';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { getActiveTicketId } from '@/features/tickets/active-ticket';
import { STATUS_LABELS_USER } from '@/features/tickets/utils/routing-labels';
import { messageExcerpt } from '@/features/tickets/utils/message-excerpt';
import { ticketKeys } from '@/hooks/api/query-keys';

/**
 * Live ticket updates for reporters (USER role only — staff are email-notified).
 * Any event invalidates the tickets cache so every visible list/detail/thread
 * refreshes; a toast fires unless that ticket's thread is already on screen.
 */
export function useTicketEvents() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const enabled = user?.role === 'USER';

    useEffect(() => {
        if (!enabled) return;
        const socket = connectSocket();

        const onEvent = (event: TicketEvent) => {
            void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            if (event.ticketId === getActiveTicketId()) return;
            notifications.show(
                event.type === 'new_message'
                    ? {
                          title: 'New reply on your report',
                          message: messageExcerpt(event.message.body),
                          color: 'teal'
                      }
                    : {
                          title: 'Your report was updated',
                          message: `Status: ${STATUS_LABELS_USER[event.status]}`,
                          color: 'teal'
                      }
            );
        };

        // Events may have been missed while disconnected — refetch once on reconnect.
        const onReconnect = () => void queryClient.invalidateQueries({ queryKey: ticketKeys.all });

        socket.on(TICKET_EVENT, onEvent);
        socket.io.on('reconnect', onReconnect);
        return () => {
            socket.off(TICKET_EVENT, onEvent);
            socket.io.off('reconnect', onReconnect);
            disconnectSocket();
        };
    }, [enabled, queryClient]);
}
