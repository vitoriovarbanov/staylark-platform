import { useEffect } from 'react';
import { Group, Stack, Text, Button, Loader, Alert, Skeleton, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { Link } from 'react-router';
import {
    IconCalendarEvent,
    IconArrowRight,
    IconHelp,
    IconAlertTriangle,
    IconChevronRight,
    IconBan
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTicket, useUpdateTicketStatus, useReassignTicket, useWithdrawTicket } from '@/hooks/api/use-tickets';
import { useProperty } from '@/hooks/api/use-properties';
import { useManagers } from '@/hooks/api/use-managers';
import { useAuth } from '@/contexts/auth-context';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { CategoryBadge } from './components/CategoryBadge';
import { PriorityBadge } from './components/PriorityBadge';
import { StatusStepper } from './components/StatusStepper';
import { TicketThread } from './components/TicketThread';
import { setActiveTicketId } from './active-ticket';
import { shortTicketId, nextStatus, nextActionLabel, STATUS_LABELS_USER } from './utils/routing-labels';
import classes from './TicketDetailModal.module.css';

interface TicketDetailModalProps {
    opened: boolean;
    onClose: () => void;
    ticketId: string | null;
}

export function TicketDetailModal({ opened, onClose, ticketId }: TicketDetailModalProps) {
    const { user } = useAuth();
    // Reassignment moved from ADMIN to the property's manager / current assignee,
    // so there is a single staff capability here rather than two tiers.
    const isStaff = user?.role === 'MANAGER';

    const ticketQuery = useTicket(ticketId, opened);
    const updateMutation = useUpdateTicketStatus();
    const reassignMutation = useReassignTicket();
    const withdrawMutation = useWithdrawTicket();
    const managersQuery = useManagers(isStaff && opened);

    const ticket = ticketQuery.data?.data ?? null;
    const propertyQuery = useProperty(ticket?.propertyId ?? '');
    const property = propertyQuery.data?.data ?? null;

    // No role suffix: only managers can hold a ticket now, so "(MANAGER)" on every
    // row is noise left over from when admins were assignable too.
    const managerOptions = (managersQuery.data ?? []).map(m => ({
        value: m.id,
        label: `${m.name} — ${m.email}`
    }));

    if (ticket?.assignedToId && !managerOptions.some(o => o.value === ticket.assignedToId)) {
        managerOptions.unshift({
            value: ticket.assignedToId,
            label: `${ticket.assignedToName ?? 'Unknown'} (removed)`
        });
    }

    useEffect(() => {
        setActiveTicketId(opened ? ticketId : null);

        return () => setActiveTicketId(null);
    }, [opened, ticketId]);

    // Denormalized on the ticket so it resolves even for soft-deleted assignees.
    const assigneeName = ticket?.assignedToName ?? null;

    const assigneeDisplay = ticket?.assignedToId
        ? (assigneeName ?? 'Assigned')
        : ticket?.needsAssignment
          ? 'Unassigned — awaiting triage'
          : 'Unassigned';

    const handleReassign = (assignedToId: string | null) => {
        if (!ticket) return;
        reassignMutation.mutate(
            { id: ticket.id, assignedToId },
            {
                onSuccess: () =>
                    notifications.show({
                        title: assignedToId ? 'Ticket reassigned' : 'Ticket unassigned',
                        message: assignedToId
                            ? 'The ticket has a new assignee.'
                            : 'The ticket is back in the triage queue.',
                        color: 'teal'
                    }),
                onError: () =>
                    notifications.show({
                        title: 'Reassignment failed',
                        message: 'Could not update the assignee.',
                        color: 'red'
                    })
            }
        );
    };

    const isUrgent = ticket?.priority === 'CRITICAL' || ticket?.priority === 'HIGH' || ticket?.category === 'EMERGENCY';

    const eyebrow = ticket ? (
        <Group gap='sm' wrap='nowrap'>
            <span>INCIDENT · {shortTicketId(ticket.id)}</span>
            <PriorityBadge priority={ticket.priority} size='xs' />
        </Group>
    ) : (
        'INCIDENT'
    );

    // Title is the AI summary (or fallback) — body NEVER repeats it
    const title = ticket
        ? (ticket.summary ?? (ticket.needsReview ? 'Awaiting human review' : 'Report received'))
        : 'Loading…';

    const handleAdvance = async () => {
        if (!ticket) return;
        const next = nextStatus(ticket.status);
        if (!next) return;
        try {
            await updateMutation.mutateAsync({ id: ticket.id, status: next });
            notifications.show({
                title: 'Status updated',
                message: `Ticket marked ${next.toLowerCase().replace('_', ' ')}.`,
                color: 'teal'
            });
        } catch {
            notifications.show({ title: 'Update failed', message: 'Could not update status.', color: 'red' });
        }
    };

    const handleReopen = async () => {
        if (!ticket) return;
        try {
            await updateMutation.mutateAsync({ id: ticket.id, status: 'IN_PROGRESS' });
            notifications.show({
                title: 'Ticket reopened',
                message: 'Status set to in progress.',
                color: 'teal'
            });
        } catch {
            notifications.show({ title: 'Update failed', message: 'Could not reopen ticket.', color: 'red' });
        }
    };

    const handleDismiss = async () => {
        if (!ticket) return;
        try {
            await updateMutation.mutateAsync({ id: ticket.id, status: 'DISMISSED' });
            notifications.show({
                title: 'Ticket dismissed',
                message: 'Marked as not an issue.',
                color: 'gray'
            });
        } catch {
            notifications.show({ title: 'Update failed', message: 'Could not dismiss ticket.', color: 'red' });
        }
    };

    const handleWithdraw = () => {
        if (!ticket) return;
        modals.openConfirmModal({
            title: 'Withdraw this report?',
            children: (
                <Text size='sm'>
                    This closes the report and can&apos;t be undone — if the problem persists, you&apos;d need to file a
                    new one.
                </Text>
            ),
            labels: { confirm: 'Withdraw report', cancel: 'Keep it' },
            confirmProps: { color: 'red' },
            onConfirm: () =>
                withdrawMutation.mutate(ticket.id, {
                    onSuccess: () =>
                        notifications.show({
                            title: 'Report withdrawn',
                            message: 'Your report has been closed.',
                            color: 'gray'
                        }),
                    onError: () =>
                        notifications.show({
                            title: 'Could not withdraw',
                            message: 'Something went wrong. Please try again.',
                            color: 'red'
                        })
                })
        });
    };

    return (
        <BrandedModal
            opened={opened}
            onClose={onClose}
            eyebrow={eyebrow}
            title={title}
            size='xl'
            tone={isUrgent ? 'urgent' : 'neutral'}
        >
            {ticketQuery.isLoading && (
                <Stack align='center' py='xl' gap='sm'>
                    <Loader />
                    <Text c='dimmed' size='sm'>
                        Loading incident…
                    </Text>
                </Stack>
            )}

            {ticketQuery.isError && (
                <Alert color='red' icon={<IconAlertTriangle size={18} />} title='Failed to load'>
                    Could not load this incident. Please try again.
                </Alert>
            )}

            {ticket && (
                <div className={classes.layout} data-has-staff={isStaff || undefined}>
                    <div className={classes.column}>
                        {ticket.transcription && (
                            <section className={classes.section}>
                                <span className={classes.sectionLabel}>Guest&apos;s words</span>
                                <div className={classes.transcription}>{ticket.transcription}</div>
                            </section>
                        )}

                        <section className={classes.section}>
                            <span className={classes.sectionLabel}>Dispatch</span>
                            <div className={classes.dispatchRow}>
                                <CategoryBadge category={ticket.category} />
                                <PriorityBadge priority={ticket.priority} />
                            </div>
                            {ticket.needsReview && (
                                <span className={classes.needsReviewPill}>
                                    <IconHelp size={14} />
                                    AI confidence low — needs human review
                                </span>
                            )}
                        </section>

                        {/* === PROPERTY === */}
                        <section className={classes.section}>
                            <span className={classes.sectionLabel}>Property</span>
                            {propertyQuery.isLoading ? (
                                <Skeleton height={76} radius='sm' />
                            ) : property ? (
                                <Link
                                    to={`/properties/${property.id}`}
                                    className={classes.propertyCard}
                                    aria-label={`View ${property.title}`}
                                >
                                    {property.photos[0] ? (
                                        <img
                                            src={property.photos[0]}
                                            alt={property.title}
                                            className={classes.propertyThumb}
                                        />
                                    ) : (
                                        <div className={classes.propertyThumb} />
                                    )}
                                    <div className={classes.propertyMeta}>
                                        <span className={classes.propertyName}>{property.title}</span>
                                        <span className={classes.propertyCity}>{property.city}</span>
                                    </div>
                                    <IconChevronRight size={18} className={classes.propertyArrow} />
                                </Link>
                            ) : null}
                        </section>

                        {/* === STAMP === */}
                        <div className={classes.stampRow}>
                            <span>
                                <IconCalendarEvent size={12} />
                                Submitted {dayjs(ticket.createdAt).format('D MMM YYYY · HH:mm')}
                            </span>
                            <span>
                                <IconArrowRight size={12} />
                                Last updated {dayjs(ticket.updatedAt).format('D MMM · HH:mm')}
                            </span>
                        </div>

                        {/* === REPORTER ACTIONS (own report, non-staff) === */}
                        {!isStaff && ticket.userId === user?.id && (
                            <section className={classes.section}>
                                <span className={classes.sectionLabel}>Status</span>
                                {ticket.status === 'DISMISSED' ? (
                                    <div className={classes.withdrawnPanel}>
                                        <span className={classes.withdrawnStamp} aria-hidden='true'>
                                            Withdrawn
                                        </span>
                                        <div className={classes.withdrawnText}>
                                            <span className={classes.withdrawnTitle}>You withdrew this report</span>
                                            <span className={classes.withdrawnMeta}>
                                                Closed {dayjs(ticket.updatedAt).format('D MMM YYYY')} · file a new
                                                report if the problem persists.
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <Text size='sm' fw={600}>
                                        {STATUS_LABELS_USER[ticket.status]}
                                    </Text>
                                )}
                            </section>
                        )}

                        <TicketThread
                            ticket={ticket}
                            footerLeft={
                                !isStaff && ticket.userId === user?.id && ticket.status === 'OPEN' ? (
                                    <Button
                                        variant='subtle'
                                        color='red'
                                        onClick={handleWithdraw}
                                        loading={withdrawMutation.isPending}
                                    >
                                        Withdraw report
                                    </Button>
                                ) : undefined
                            }
                        />
                    </div>

                    {isStaff && (
                        <aside className={classes.staffPanel}>
                            <span className={classes.staffEyebrow}>Assigned to</span>
                            {isStaff ? (
                                <Select
                                    aria-label='Assigned to'
                                    data={managerOptions}
                                    value={ticket.assignedToId}
                                    onChange={value => handleReassign(value)}
                                    placeholder={
                                        managersQuery.isLoading ? 'Loading staff…' : 'Unassigned — awaiting triage'
                                    }
                                    clearable
                                    searchable
                                    disabled={managersQuery.isLoading || reassignMutation.isPending}
                                />
                            ) : (
                                <Text size='sm'>{assigneeDisplay}</Text>
                            )}

                            <span className={classes.staffEyebrow}>Status</span>
                            {ticket.status === 'DISMISSED' ? (
                                <Alert color='gray' icon={<IconBan size={18} />} title='Dismissed — not an issue'>
                                    This ticket was closed without action.
                                </Alert>
                            ) : (
                                <StatusStepper status={ticket.status} />
                            )}
                            {nextActionLabel(ticket.status) && (
                                <Button onClick={handleAdvance} loading={updateMutation.isPending} fullWidth>
                                    {nextActionLabel(ticket.status)}
                                </Button>
                            )}
                            {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
                                <Button
                                    variant='subtle'
                                    color='gray'
                                    onClick={handleDismiss}
                                    loading={updateMutation.isPending}
                                    fullWidth
                                >
                                    Dismiss — not an issue
                                </Button>
                            )}
                            {(ticket.status === 'RESOLVED' || ticket.status === 'DISMISSED') && (
                                <Button
                                    variant='subtle'
                                    color='gray'
                                    onClick={handleReopen}
                                    loading={updateMutation.isPending}
                                    fullWidth
                                >
                                    Reopen
                                </Button>
                            )}
                        </aside>
                    )}
                </div>
            )}
        </BrandedModal>
    );
}
