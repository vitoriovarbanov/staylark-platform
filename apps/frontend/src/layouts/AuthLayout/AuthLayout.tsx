import { Title, Text, Stack, Group } from '@mantine/core';
import { RooflineField } from '@/components/RooflineField/RooflineField';
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
            <RooflineField tone='dusk' />

            {/* No "Back to home": the app is gated, so '/' would bounce straight back here. */}

            <div className={classes.formSide}>
                <div className={classes.formInner}>
                    <Stack align='center' mb='xl'>
                        {/* Mark is decorative — the wordmark beside it carries the name. Inlined
                            (not logo-icon.svg) so the roof can turn white on the dark ground. */}
                        <Group gap={10} align='center'>
                            <svg className={classes.logoMark} viewBox='0 0 48 48' aria-hidden='true'>
                                <path className={classes.logoRoof} d='M4.5 29 24 10 43.5 29' />
                                <path className={classes.logoWing} d='M11.5 35.5c6.5-6.5 13.5-5.5 21 2' />
                            </svg>
                            <Text className={classes.logoWord}>Staylark</Text>
                        </Group>
                    </Stack>

                    <div className={classes.card}>
                        <Stack gap={6} mb='xl'>
                            <Title order={2} className={classes.title}>
                                {title}
                            </Title>
                            {subtitle && <Text className={classes.subtitle}>{subtitle}</Text>}
                        </Stack>
                        {children}
                    </div>

                    {footer && (
                        <Text size='sm' ta='center' mt='lg' className={classes.footer}>
                            {footer}
                        </Text>
                    )}
                </div>
            </div>
        </div>
    );
}
