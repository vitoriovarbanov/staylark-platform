import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';

/**
 * <PageHeader> — single source of truth for the admin/consumer page header
 * pattern: Outfit 700 Title (order=2) + secondary-ink subtitle, with an optional
 * right-aligned actions slot.
 *
 * Subtitle uses Ink Muted (#64748b, ~4.76:1 on the page) — the design system's
 * AA floor for body text — not Mantine `dimmed` (#868e96), which fails at 3.15:1.
 *
 * Does NOT own breadcrumbs / back links.
 */
export interface PageHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    const titleBlock = (
        <Stack gap={4}>
            <Title order={2} ff='Outfit' fw={700} lts={-0.4}>
                {title}
            </Title>
            {subtitle ? (
                <Text c='var(--mantine-other-text-secondary)' size='sm'>
                    {subtitle}
                </Text>
            ) : null}
        </Stack>
    );

    if (!actions) return titleBlock;

    return (
        <Group justify='space-between' align='flex-end' wrap='wrap'>
            {titleBlock}
            {actions}
        </Group>
    );
}
