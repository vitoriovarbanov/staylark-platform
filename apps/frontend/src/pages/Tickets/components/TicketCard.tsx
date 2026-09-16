import dayjs from 'dayjs';
import type { Ticket } from '@staylark/contract';
import { IconBuilding, IconBan } from '@tabler/icons-react';
import { CategoryBadge } from '@/features/tickets/components/CategoryBadge';
import { PriorityBadge } from '@/features/tickets/components/PriorityBadge';
import { STATUS_LABELS_USER, shortTicketId } from '@/features/tickets/utils/routing-labels';
import classes from './TicketCard.module.css';

interface TicketCardProps {
    ticket: Ticket;
    propertyName?: string;
    propertyCity?: string;
    propertyPhoto?: string | null;
    onClick: () => void;
}

export function TicketCard({ ticket, propertyName, propertyCity, propertyPhoto, onClick }: TicketCardProps) {
    return (
        <button
            type='button'
            className={classes.card}
            onClick={onClick}
            aria-label={`Open incident ${shortTicketId(ticket.id)}`}
        >
            <div className={classes.photo}>
                {propertyPhoto ? <img src={propertyPhoto} alt={propertyName ?? 'Property'} /> : null}
                {propertyCity && <span className={classes.cityCaption}>{propertyCity}</span>}
            </div>

            <div className={classes.body}>
                <div className={classes.eyebrow}>
                    <span className={classes.eyebrowId}>INCIDENT · {shortTicketId(ticket.id)}</span>
                    <span className={classes.eyebrowDot} aria-hidden='true' />
                    <span>{dayjs(ticket.createdAt).format('D MMM YYYY')}</span>
                </div>

                <p className={classes.summary}>{ticket.summary ?? 'Awaiting human review'}</p>

                <div className={classes.dispatch}>
                    <CategoryBadge category={ticket.category} size='xs' />
                    <PriorityBadge priority={ticket.priority} size='xs' />
                </div>

                {propertyName && (
                    <span className={classes.propertyLine}>
                        <IconBuilding size={13} />
                        {propertyName}
                    </span>
                )}
            </div>

            <div className={classes.statusColumn}>
                {ticket.unreadMessageCount > 0 && (
                    <span className={classes.unreadBadge}>
                        {ticket.unreadMessageCount} new {ticket.unreadMessageCount === 1 ? 'reply' : 'replies'}
                    </span>
                )}
                <span className={classes.statusStamp} data-status={ticket.status}>
                    {ticket.status === 'DISMISSED' && <IconBan size={11} stroke={2.5} aria-hidden='true' />}
                    {STATUS_LABELS_USER[ticket.status]}
                </span>
                <div className={classes.timestampMono}>
                    <span>UPDATED</span>
                    <br />
                    {dayjs(ticket.updatedAt).format('D MMM · HH:mm')}
                </div>
            </div>
        </button>
    );
}
