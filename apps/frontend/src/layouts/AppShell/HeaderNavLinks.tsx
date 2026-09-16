import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { ActionIcon, Button, Group, Indicator, Tooltip } from '@mantine/core';
import { IconCalendar, IconAlertOctagon } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTicketUnreadCount } from '@/hooks/api/use-ticket-messages';

interface NavItem {
    label: string;
    to: string;
    icon: Icon;
}

const REPORTS_PATH = '/tickets';

const NAV_ITEMS: NavItem[] = [
    { label: 'My Bookings', to: '/bookings', icon: IconCalendar },
    { label: 'My Reports', to: REPORTS_PATH, icon: IconAlertOctagon }
];

export function HeaderNavLinks() {
    const location = useLocation();
    const isActive = (to: string) => location.pathname.startsWith(to);

    // Reporter-facing aggregate of unread staff replies across all their reports.
    // Refreshes live: useTicketEvents invalidates ticketKeys.all on socket pushes.
    const { data } = useTicketUnreadCount();
    const unread = data?.data.count ?? 0;
    const reportsTip =
        unread > 0 ? `${unread} new ${unread === 1 ? 'reply' : 'replies'} on your reports` : 'My Reports';

    return (
        <>
            {/* Desktop: icon + text */}
            <Group gap='xs' visibleFrom='sm'>
                {NAV_ITEMS.map(({ label, to, icon: ItemIcon }) => {
                    const button = (
                        <Button
                            key={to}
                            component={Link}
                            to={to}
                            variant={isActive(to) ? 'light' : 'subtle'}
                            size='sm'
                            leftSection={<ItemIcon size={16} stroke={1.5} />}
                            // Header nav reads as plain links, not bordered buttons — opt these
                            // out of the global subtle-variant hairline border.
                            style={{ '--button-bd': '1px solid transparent' } as CSSProperties}
                        >
                            {label}
                        </Button>
                    );

                    if (to !== REPORTS_PATH || unread === 0) return button;

                    return (
                        <Indicator key={to} label={unread} size={18} color='teal' offset={8} withBorder>
                            <Tooltip label={reportsTip} withArrow>
                                {button}
                            </Tooltip>
                        </Indicator>
                    );
                })}
            </Group>

            {/* Mobile: icon-only */}
            <Group gap={4} hiddenFrom='sm'>
                {NAV_ITEMS.map(({ label, to, icon: ItemIcon }) => {
                    const showBadge = to === REPORTS_PATH && unread > 0;
                    const actionIcon = (
                        <ActionIcon
                            component={Link}
                            to={to}
                            aria-label={showBadge ? `${label}, ${unread} unread` : label}
                            variant={isActive(to) ? 'light' : 'subtle'}
                            size='lg'
                        >
                            <ItemIcon size={20} stroke={1.5} />
                        </ActionIcon>
                    );

                    return (
                        <Tooltip key={to} label={showBadge ? reportsTip : label} withArrow>
                            {showBadge ? (
                                <Indicator label={unread} size={16} color='teal' offset={4} withBorder>
                                    {actionIcon}
                                </Indicator>
                            ) : (
                                actionIcon
                            )}
                        </Tooltip>
                    );
                })}
            </Group>
        </>
    );
}
