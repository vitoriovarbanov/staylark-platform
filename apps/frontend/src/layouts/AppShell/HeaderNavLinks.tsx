import { Link, useLocation } from 'react-router';
import { Box, Tooltip } from '@mantine/core';
import { IconCalendar, IconAlertOctagon } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTicketUnreadCount } from '@/hooks/api/use-ticket-messages';
import classes from './AppShell.module.css';

interface NavItem {
    label: string;
    to: string;
    icon: Icon;
}

const REPORTS_PATH = '/tickets';

const NAV_ITEMS: NavItem[] = [
    { label: 'My bookings', to: '/bookings', icon: IconCalendar },
    { label: 'My reports', to: REPORTS_PATH, icon: IconAlertOctagon }
];

export function HeaderNavLinks() {
    const location = useLocation();
    const isActive = (to: string) => location.pathname.startsWith(to);

    // Reporter-facing aggregate of unread staff replies across all their reports.
    // Refreshes live: useTicketEvents invalidates ticketKeys.all on socket pushes.
    const { data } = useTicketUnreadCount();
    const unread = data?.data.count ?? 0;
    const reportsTip = `${unread} new ${unread === 1 ? 'reply' : 'replies'} on your reports`;

    return (
        <>
            {/* Desktop: icon + text */}
            <Box component='nav' aria-label='Main' className={classes.track} visibleFrom='sm'>
                {NAV_ITEMS.map(({ label, to, icon: ItemIcon }) => {
                    const showCount = to === REPORTS_PATH && unread > 0;
                    const tab = (
                        <Link
                            key={to}
                            to={to}
                            className={classes.tab}
                            data-active={isActive(to) || undefined}
                            aria-current={isActive(to) ? 'page' : undefined}
                        >
                            <ItemIcon size={17} stroke={1.7} />
                            {label}
                            {showCount && (
                                <span className={classes.count} aria-label={reportsTip}>
                                    {unread}
                                </span>
                            )}
                        </Link>
                    );

                    return showCount ? (
                        <Tooltip key={to} label={reportsTip} withArrow>
                            {tab}
                        </Tooltip>
                    ) : (
                        tab
                    );
                })}
            </Box>

            {/* Mobile: icon-only */}
            <Box component='nav' aria-label='Main' className={classes.track} hiddenFrom='sm'>
                {NAV_ITEMS.map(({ label, to, icon: ItemIcon }) => {
                    const showCount = to === REPORTS_PATH && unread > 0;
                    return (
                        <Tooltip key={to} label={showCount ? reportsTip : label} withArrow>
                            <Link
                                to={to}
                                className={`${classes.tab} ${classes.tabIcon}`}
                                data-active={isActive(to) || undefined}
                                aria-current={isActive(to) ? 'page' : undefined}
                                aria-label={showCount ? `${label}, ${unread} unread` : label}
                            >
                                <ItemIcon size={20} stroke={1.7} />
                                {showCount && (
                                    <span className={classes.count} aria-hidden='true'>
                                        {unread}
                                    </span>
                                )}
                            </Link>
                        </Tooltip>
                    );
                })}
            </Box>
        </>
    );
}
