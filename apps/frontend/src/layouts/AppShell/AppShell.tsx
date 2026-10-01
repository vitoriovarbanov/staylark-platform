import { Outlet, Link, useNavigate } from 'react-router';
import { AppShell as MantineAppShell, Menu, Avatar, Text, UnstyledButton, Divider, Image } from '@mantine/core';
import { IconSettings, IconLogout, IconChevronDown, IconUser } from '@tabler/icons-react';
import { FeedbackChip } from '@/components/FeedbackChip/FeedbackChip';
import { useAuth } from '@/contexts/auth-context';
import { useTicketEvents } from '@/hooks/use-ticket-events';
import logoIcon from '@/assets/logo-icon.svg';
import { AppFooter } from './AppFooter';
import { HeaderNavLinks } from './HeaderNavLinks';
import classes from './AppShell.module.css';

export function AppShellLayout() {
    const { user, signOut } = useAuth();
    useTicketEvents();
    const navigate = useNavigate();

    const isStaff = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const firstName = user?.name?.trim().split(/\s+/)[0];

    return (
        <MantineAppShell header={{ height: 88 }} padding='md'>
            {/* Floating header: a transparent band holding one pill, so pages (and the
                home hero's dusk band) run behind it. Clicks pass through around the pill. */}
            <MantineAppShell.Header className={classes.header} withBorder={false}>
                <div className={classes.pill}>
                    <Link to='/' className={classes.logo}>
                        {/* Mark is decorative — the wordmark beside it carries the name. */}
                        <Image src={logoIcon} alt='' h={28} w='auto' />
                        <span className={classes.logoText}>Staylark</span>
                    </Link>

                    {!isStaff && <HeaderNavLinks />}

                    <div className={classes.end}>
                        <FeedbackChip />

                        {/* Every route under this shell is gated, so the visitor is always signed in. */}
                        <Menu shadow='md' width={220} position='bottom-end' offset={10}>
                            <Menu.Target>
                                <UnstyledButton className={classes.userButton}>
                                    <Avatar src={user?.image} radius='xl' size={32} color='brand'>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Text size='sm' fw={600} visibleFrom='sm'>
                                        {firstName}
                                    </Text>
                                    <IconChevronDown size={14} stroke={1.8} />
                                </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>
                                    <Text size='xs' c='dimmed' truncate>
                                        {user?.email}
                                    </Text>
                                </Menu.Label>
                                <Divider />
                                {isStaff && (
                                    <Menu.Item
                                        leftSection={<IconSettings size={14} />}
                                        onClick={() => navigate('/admin')}
                                    >
                                        Admin panel
                                    </Menu.Item>
                                )}
                                <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/profile')}>
                                    Profile
                                </Menu.Item>
                                <Menu.Item color='red' leftSection={<IconLogout size={14} />} onClick={signOut}>
                                    Sign out
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </div>
                </div>
            </MantineAppShell.Header>

            <MantineAppShell.Main className={classes.main}>
                <div className={classes.page}>
                    <Outlet />
                </div>
                <AppFooter />
            </MantineAppShell.Main>
        </MantineAppShell>
    );
}
