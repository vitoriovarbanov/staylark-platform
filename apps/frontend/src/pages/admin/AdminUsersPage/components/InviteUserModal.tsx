import { useEffect } from 'react';
import { Button, Select, Stack, Text, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { CreateInvitationSchema } from '@staylark/contract';
import type { UserRole } from '@staylark/contract';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';

const FORM_ID = 'invite-user-form';

const ROLE_OPTIONS = [
    { value: 'USER', label: 'User' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' }
];

interface InviteUserModalProps {
    opened: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (values: { name: string; email: string; role: UserRole }) => void;
}

export function InviteUserModal({ opened, isSaving, onClose, onSubmit }: InviteUserModalProps) {
    const form = useForm<{ name: string; email: string; role: UserRole }>({
        validate: zodResolver(CreateInvitationSchema),
        initialValues: { name: '', email: '', role: 'USER' }
    });

    useEffect(() => {
        if (opened) form.reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const handleSubmit = form.onSubmit(onSubmit);

    return (
        <BrandedModal
            opened={opened}
            onClose={onClose}
            eyebrow='USER · INVITE'
            title='Invite user'
            footer={
                <>
                    <Button variant='subtle' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type='submit' form={FORM_ID} loading={isSaving}>
                        Send invite
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={handleSubmit}>
                <Stack>
                    <Text size='sm' c='dimmed'>
                        The user receives an email to set their own password, then can sign in. You never handle their
                        password.
                    </Text>
                    <TextInput label='Name' placeholder='Jane Manager' withAsterisk {...form.getInputProps('name')} />
                    <TextInput
                        label='Email'
                        placeholder='jane@example.com'
                        withAsterisk
                        {...form.getInputProps('email')}
                    />
                    <Select
                        label='Role'
                        data={ROLE_OPTIONS}
                        withAsterisk
                        allowDeselect={false}
                        {...form.getInputProps('role')}
                    />
                </Stack>
            </form>
        </BrandedModal>
    );
}
