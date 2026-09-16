import { Paper, Title, Text, Stack, Group, Image } from '@mantine/core';
import logoIcon from '@/assets/logo-icon.svg';
import { ContourField } from '@/components/ContourField/ContourField';
import classes from './AuthLayout.module.css';

interface AuthLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
    return (
        <div className={classes.wrapper}>
            <ContourField />

            {/* No "Back to home": the app is gated, so '/' would bounce straight back here. */}

            <div className={classes.formSide}>
                <div className={classes.formInner}>
                    <Stack align='center' mb='xl'>
                        {/* Mark is decorative — the wordmark beside it carries the name. */}
                        <Group gap={10} align='center'>
                            <Image src={logoIcon} alt='' h={40} w='auto' />
                            <Text className={classes.logoWord}>Staylark</Text>
                        </Group>
                    </Stack>

                    <Paper className={classes.card} p='xl' radius={0}>
                        <span className={`${classes.corner} ${classes.cornerTL}`} />
                        <span className={`${classes.corner} ${classes.cornerTR}`} />
                        <span className={`${classes.corner} ${classes.cornerBL}`} />
                        <span className={`${classes.corner} ${classes.cornerBR}`} />

                        <Stack gap='xs' mb='xl'>
                            <Title order={2} ta='center' className={classes.title}>
                                {title}
                            </Title>
                            {subtitle && (
                                <Text c='var(--mantine-other-text-secondary)' size='sm' ta='center'>
                                    {subtitle}
                                </Text>
                            )}
                        </Stack>
                        {children}
                    </Paper>

                    {footer && (
                        <Text c='var(--mantine-other-text-secondary)' size='sm' ta='center' mt='lg'>
                            {footer}
                        </Text>
                    )}
                </div>
            </div>
        </div>
    );
}
