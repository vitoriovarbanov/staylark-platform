import { Outlet, Link, useNavigate } from 'react-router';
import { AppShell as MantineAppShell, Group, Menu, Avatar, Text, UnstyledButton, Divider, Image } from '@mantine/core';
import { IconSettings, IconLogout, IconChevronDown, IconUser } from '@tabler/icons-react';
import { FeedbackBanner } from '@/components/FeedbackBanner/FeedbackBanner';
import { useAuth } from '@/contexts/auth-context';
import { useTicketEvents } from '@/hooks/use-ticket-events';
import logoIcon from '@/assets/logo-icon.svg';
import { HeaderNavLinks } from './HeaderNavLinks';
import classes from './AppShell.module.css';

export function AppShellLayout() {
    const { user, signOut } = useAuth();
    useTicketEvents();
    const navigate = useNavigate();

    const isStaff = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <MantineAppShell header={{ height: 56 }} padding='md'>
            <MantineAppShell.Header className={classes.header}>
                <Group h='100%' px='md' justify='space-between'>
                    <Link to='/' className={classes.logo}>
                        {/* Mark is decorative — the wordmark beside it carries the name. */}
                        <Group gap={8} align='center'>
                            <Image src={logoIcon} alt='' h={30} w='auto' />
                            <Text className={classes.logoText} fz={20}>
                                Staylark
                            </Text>
                        </Group>
                    </Link>

                    {/* Auth actions — every route under this shell is gated, so the
                        visitor is always signed in by the time it renders. */}
                    <Group gap='sm'>
                        {!isStaff && <HeaderNavLinks />}
                        <Menu shadow='md' width={200} position='bottom-end'>
                            <Menu.Target>
                                <UnstyledButton className={classes.userButton}>
                                    <Group gap='xs'>
                                        <Avatar src={user?.image} radius='xl' size={28} color='brand'>
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Text size='sm' fw={500} visibleFrom='sm'>
                                            {user?.name}
                                        </Text>
                                        <IconChevronDown size={14} stroke={1.5} />
                                    </Group>
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
                                        Admin Panel
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
                    </Group>
                </Group>
            </MantineAppShell.Header>

            <MantineAppShell.Main>
                <FeedbackBanner />
                <Outlet />
            </MantineAppShell.Main>
        </MantineAppShell>
    );
}
