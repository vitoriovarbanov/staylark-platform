import { useEffect } from 'react';
import { Alert, Button, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { AdminUpdateUser, AdminUser, UserRole } from '@staylark/contract';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { useManagers } from '@/hooks/api/use-managers';

const FORM_ID = 'edit-user-form';

const ROLE_OPTIONS = [
    { value: 'USER', label: 'User' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' }
];

interface EditUserModalProps {
    user: AdminUser | null;
    isSaving: boolean;
    isSelf: boolean;
    onClose: () => void;
    onSubmit: (patch: AdminUpdateUser) => void;
}

export function EditUserModal({ user, isSaving, isSelf, onClose, onSubmit }: EditUserModalProps) {
    const form = useForm<{ name: string; role: UserRole; successorManagerId: string | null }>({
        initialValues: { name: '', role: 'USER', successorManagerId: null },
        validate: { name: value => (value.trim().length === 0 ? 'Name is required' : null) }
    });

    useEffect(() => {
        if (user) form.setValues({ name: user.name, role: user.role, successorManagerId: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Demoting staff to USER strips their access, so their properties and open
    // tickets must land on another manager — otherwise they would be orphaned,
    // invisible to every manager and unreachable by admins.
    const isDemotingStaff = !isSelf && user !== null && user.role !== 'USER' && form.values.role === 'USER';
    const managersQuery = useManagers(isDemotingStaff);
    const successorOptions = (managersQuery.data ?? [])
        .filter(m => m.id !== user?.id)
        .map(m => ({ value: m.id, label: `${m.name} (${m.email})` }));

    const handleSubmit = form.onSubmit(values => {
        // An admin cannot change their own role — send only the name so the
        // backend self-role guard isn't tripped on a no-op role.
        if (isSelf) {
            onSubmit({ name: values.name });
            return;
        }
        onSubmit({
            name: values.name,
            role: values.role,
            ...(isDemotingStaff && values.successorManagerId ? { successorManagerId: values.successorManagerId } : {})
        });
    });

    return (
        <BrandedModal
            opened={user !== null}
            onClose={onClose}
            eyebrow='USER · EDIT'
            title={user?.name || 'Edit user'}
            footer={
                <>
                    <Button variant='subtle' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type='submit'
                        form={FORM_ID}
                        loading={isSaving}
                        disabled={isDemotingStaff && !form.values.successorManagerId}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={handleSubmit}>
                <Stack>
                    <TextInput label='Name' withAsterisk {...form.getInputProps('name')} />
                    <Select
                        label='Role'
                        data={ROLE_OPTIONS}
                        withAsterisk
                        allowDeselect={false}
                        disabled={isSelf}
                        description={isSelf ? 'You cannot change your own role.' : undefined}
                        {...form.getInputProps('role')}
                    />

                    {isDemotingStaff && (
                        <>
                            <Alert variant='light' color='orange' icon={<IconAlertTriangle size={16} />}>
                                {user?.name} manages properties. Choose who inherits them — their properties and open
                                tickets move immediately.
                            </Alert>
                            <Select
                                label='Successor manager'
                                placeholder={managersQuery.isLoading ? 'Loading managers…' : 'Select a manager'}
                                data={successorOptions}
                                withAsterisk
                                searchable
                                nothingFoundMessage='No other managers available'
                                disabled={managersQuery.isLoading}
                                {...form.getInputProps('successorManagerId')}
                            />
                        </>
                    )}
                </Stack>
            </form>
        </BrandedModal>
    );
}
