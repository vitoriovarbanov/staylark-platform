import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconHome, IconLanguage, IconPhone, IconUser } from '@tabler/icons-react';
import type { MyProfileFields } from '@staylark/contract';
import classes from './ProfileAbout.module.css';

interface ProfileAboutProps {
    profile: MyProfileFields;
}

interface FieldRowProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}

function FieldRow({ icon, label, children }: FieldRowProps) {
    return (
        <div className={classes.row}>
            <span className={classes.icon}>{icon}</span>
            <span className={classes.label}>{label}</span>
            <div className={classes.value}>{children}</div>
        </div>
    );
}

function Muted({ text }: { text: string }) {
    return <span className={classes.muted}>{text}</span>;
}

export function ProfileAbout({ profile }: ProfileAboutProps) {
    const { bio, homeCity, phone, languages } = profile;

    return (
        <Paper withBorder radius='lg' p='lg' className={classes.card}>
            <Group gap={8} mb='md'>
                <span className={classes.titleAccent} aria-hidden='true' />
                <Title order={2} className={classes.title}>
                    About
                </Title>
            </Group>

            <Stack gap='sm'>
                <FieldRow icon={<IconUser size={16} stroke={1.8} />} label='Bio'>
                    {bio ? (
                        <Text className={classes.bioText}>{bio}</Text>
                    ) : (
                        <Muted text='Tell travellers about yourself' />
                    )}
                </FieldRow>

                <FieldRow icon={<IconHome size={16} stroke={1.8} />} label='Home city'>
                    {homeCity ? <Text className={classes.fieldText}>{homeCity}</Text> : <Muted text='—' />}
                </FieldRow>

                <FieldRow icon={<IconPhone size={16} stroke={1.8} />} label='Phone'>
                    {phone ? <Text className={classes.fieldText}>{phone}</Text> : <Muted text='—' />}
                </FieldRow>

                <FieldRow icon={<IconLanguage size={16} stroke={1.8} />} label='Languages'>
                    {languages.length > 0 ? (
                        <Group gap={6}>
                            {languages.map(lang => (
                                <Badge
                                    key={lang}
                                    variant='light'
                                    color='brand'
                                    radius='sm'
                                    tt='none'
                                    styles={{ label: { color: 'var(--mantine-color-brand-8)' } }}
                                >
                                    {lang}
                                </Badge>
                            ))}
                        </Group>
                    ) : (
                        <Muted text='—' />
                    )}
                </FieldRow>
            </Stack>
        </Paper>
    );
}
