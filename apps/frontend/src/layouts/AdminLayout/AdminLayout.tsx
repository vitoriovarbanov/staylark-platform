import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import {
    AppShell,
    Badge,
    Burger,
    Group,
    NavLink,
    Title,
    Stack,
    Text,
    Breadcrumbs,
    Anchor,
    Divider,
    Avatar,
    Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconDashboard,
    IconBuilding,
    IconCalendar,
    IconMicrophone,
    IconTicket,
    IconChartBar,
    IconClipboardList,
    IconRoute,
    IconCurrencyDollar,
    IconUsers,
    IconLogout,
    IconHome
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/auth-context';
import { adminHomePath } from '@/lib/admin-home';
import { usePendingNearExpiryCount, useAllPendingCount } from '@/hooks/api/use-bookings';
import { useTickets } from '@/hooks/api/use-tickets';
import classes from './AdminLayout.module.css';

type NavIcon = typeof IconDashboard;

/**
 * Which roles may see an item. An explicit list rather than an `adminOnly`
 * boolean: the portal now has three states — admin-only, manager-only, and
 * (in principle) shared — which a boolean cannot express.
 */
type NavRole = 'ADMIN' | 'MANAGER';

interface NavLeaf {
    label: string;
    to: string;
    icon: NavIcon;
    roles: NavRole[];
}

interface NavGroup {
    label: string;
    icon: NavIcon;
    children: NavLeaf[];
    roles?: NavRole[];
}

type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
    return 'children' in item;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/admin', icon: IconDashboard, roles: ['MANAGER'] },
    { label: 'Properties', to: '/admin/properties', icon: IconBuilding, roles: ['MANAGER'] },
    { label: 'Bookings', to: '/admin/bookings', icon: IconCalendar, roles: ['MANAGER'] },
    { label: 'Feedback', to: '/admin/feedback', icon: IconMicrophone, roles: ['MANAGER'] },
    {
        label: 'Tickets',
        icon: IconTicket,
        children: [
            { label: 'Ticket Management', to: '/admin/tickets', icon: IconClipboardList, roles: ['MANAGER'] },
            { label: 'Overview', to: '/admin/ticket-overview', icon: IconChartBar, roles: ['MANAGER'] },
            // Staffing config: who specialises in which category. Admins configure it;
            // managers read it (to see why a ticket went elsewhere) and may add or
            // remove only themselves.
            { label: 'Ticket Routing', to: '/admin/ticket-routing', icon: IconRoute, roles: ['ADMIN', 'MANAGER'] }
        ]
    },
    { label: 'Users', to: '/admin/users', icon: IconUsers, roles: ['ADMIN'] },
    { label: 'Pricing', to: '/admin/pricing', icon: IconCurrencyDollar, roles: ['MANAGER'] }
];

export function AdminLayout() {
    const [opened, { toggle, close }] = useDisclosure();

    const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
    const { user, signOut } = useAuth();
    const location = useLocation();

    const isManager = user?.role === 'MANAGER';
    const staffRole: NavRole | undefined =
        user?.role === 'ADMIN' ? 'ADMIN' : user?.role === 'MANAGER' ? 'MANAGER' : undefined;

    // Filter leaves by role, then drop any group left with zero visible children.
    // That collapse is what removes the whole Tickets group for an ADMIN, whose
    // only entry there is Ticket Routing.
    const canSee = (roles: NavRole[] | undefined) => !roles || (!!staffRole && roles.includes(staffRole));
    const visibleItems = navItems
        .filter(item => (isGroup(item) ? true : canSee(item.roles)))
        .map<NavItem | null>(item => {
            if (!isGroup(item)) return item;
            const children = item.children.filter(child => canSee(child.roles));
            return children.length > 0 ? { ...item, children } : null;
        })
        .filter((item): item is NavItem => item !== null);

    // Both badge sources are manager-only endpoints; firing them as an ADMIN
    // would 403 in the background on every admin page load.
    const { data: nearExpiryData } = usePendingNearExpiryCount(isManager);
    const nearExpiryCount = nearExpiryData?.data.count ?? 0;
    const { data: allPendingData } = useAllPendingCount(isManager);
    const totalPendingCount = allPendingData?.total ?? 0;
    const otherPendingCount = Math.max(0, totalPendingCount - nearExpiryCount);

    const { data: myAssignedTickets } = useTickets(
        user?.id ? { assignedToId: user.id, limit: 100 } : { limit: 1 },
        isManager && !!user?.id
    );
    const ticketsNeedReply = isManager && (myAssignedTickets?.data.tickets ?? []).some(t => t.awaitingStaffReply);

    // Build breadcrumbs from path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = pathSegments.map((segment, index) => {
        // The root "Admin" crumb links to the role's portal home — managers can't
        // open the admin dashboard, so it points them at Properties instead.
        const path = index === 0 ? adminHomePath(user?.role) : '/' + pathSegments.slice(0, index + 1).join('/');
        const label = segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = index === pathSegments.length - 1;
        return isLast ? (
            <Text key={path} size='sm' c='dimmed'>
                {label}
            </Text>
        ) : (
            <Anchor key={path} component={Link} to={path} size='sm'>
                {label}
            </Anchor>
        );
    });

    return (
        <AppShell
            navbar={{
                width: 250,
                breakpoint: 'sm',
                collapsed: { mobile: !opened }
            }}
            padding='md'
        >
            <AppShell.Navbar p='xs'>
                <Stack gap={4} justify='space-between' style={{ flex: 1 }}>
                    <div>
                        <Group justify='space-between' p='xs'>
                            <Title order={4}>Admin Panel</Title>
                            <Burger opened={opened} onClick={toggle} hiddenFrom='sm' size='sm' />
                        </Group>
                        {visibleItems.map(item => {
                            if (isGroup(item)) {
                                const childActive = item.children.some(child => location.pathname.startsWith(child.to));
                                // Controlled: follow the active route by default (the navbar
                                // is a persistent layout that mounts once, so an uncontrolled
                                // defaultOpened wouldn't react to in-app navigation), but let an
                                // explicit user toggle override.
                                const groupOpened = groupOverrides[item.label] ?? childActive;
                                const showReplyDot = item.label === 'Tickets' && ticketsNeedReply;
                                return (
                                    <NavLink
                                        key={item.label}
                                        label={item.label}
                                        leftSection={<item.icon size={18} stroke={1.5} />}
                                        rightSection={
                                            showReplyDot ? (
                                                <Tooltip label='New guest reply awaiting your response' withArrow>
                                                    <Badge
                                                        size='xs'
                                                        circle
                                                        variant='filled'
                                                        className={classes.replyDot}
                                                        aria-label='Tickets awaiting your reply'
                                                    />
                                                </Tooltip>
                                            ) : undefined
                                        }
                                        opened={groupOpened}
                                        onClick={() =>
                                            setGroupOverrides(prev => ({ ...prev, [item.label]: !groupOpened }))
                                        }
                                        active={childActive && !groupOpened}
                                        className={classes.navLink}
                                    >
                                        {item.children.map(child => (
                                            <NavLink
                                                key={child.to}
                                                component={Link}
                                                to={child.to}
                                                label={child.label}
                                                leftSection={<child.icon size={18} stroke={1.5} />}
                                                active={location.pathname.startsWith(child.to)}
                                                onClick={close}
                                                className={classes.navLink}
                                            />
                                        ))}
                                    </NavLink>
                                );
                            }
                            const isBookings = item.to === '/admin/bookings';
                            return (
                                <NavLink
                                    key={item.to}
                                    component={Link}
                                    to={item.to}
                                    label={item.label}
                                    leftSection={<item.icon size={18} stroke={1.5} />}
                                    rightSection={
                                        isBookings && totalPendingCount > 0 ? (
                                            <Group gap={4} wrap='nowrap'>
                                                {nearExpiryCount > 0 && (
                                                    <Tooltip
                                                        label={`${nearExpiryCount} pending booking${nearExpiryCount === 1 ? '' : 's'} expiring within 12 hours`}
                                                        withArrow
                                                    >
                                                        <Badge
                                                            size='sm'
                                                            variant='filled'
                                                            className={classes.expiryBadge}
                                                            circle
                                                        >
                                                            {nearExpiryCount}
                                                        </Badge>
                                                    </Tooltip>
                                                )}
                                                {otherPendingCount > 0 && (
                                                    <Tooltip
                                                        label={`${otherPendingCount} other pending booking${otherPendingCount === 1 ? '' : 's'}`}
                                                        withArrow
                                                    >
                                                        <Badge size='sm' variant='light' color='gray' circle>
                                                            {otherPendingCount}
                                                        </Badge>
                                                    </Tooltip>
                                                )}
                                            </Group>
                                        ) : undefined
                                    }
                                    active={
                                        item.to === '/admin'
                                            ? location.pathname === '/admin'
                                            : location.pathname.startsWith(item.to)
                                    }
                                    onClick={close}
                                    className={classes.navLink}
                                />
                            );
                        })}
                    </div>
                    <div>
                        <Divider mb='xs' />
                        <NavLink
                            component={Link}
                            to='/'
                            label='Back to site'
                            leftSection={<IconHome size={18} stroke={1.5} />}
                            className={classes.navLink}
                        />
                        <Group p='xs' gap='sm'>
                            <Avatar src={user?.image} radius='xl' size={28} color='brand'>
                                {user?.name?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                <Text size='sm' fw={500} truncate>
                                    {user?.name}
                                </Text>
                                <Text size='xs' c='dimmed' truncate>
                                    {user?.email}
                                </Text>
                            </Stack>
                        </Group>
                        <NavLink
                            label='Sign out'
                            leftSection={<IconLogout size={18} stroke={1.5} />}
                            onClick={signOut}
                            className={classes.navLink}
                            c='red'
                        />
                    </div>
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Stack gap='md'>
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom='sm' size='sm' />
                        <Breadcrumbs>{breadcrumbs}</Breadcrumbs>
                    </Group>
                    <Outlet />
                </Stack>
            </AppShell.Main>
        </AppShell>
    );
}
