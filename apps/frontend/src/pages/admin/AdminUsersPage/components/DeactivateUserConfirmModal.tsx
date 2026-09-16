import { useState } from 'react';
import { Alert, Button, Select, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { AdminUser } from '@staylark/contract';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { useManagers } from '@/hooks/api/use-managers';

interface DeactivateUserConfirmModalProps {
    user: AdminUser | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: (successorManagerId?: string) => void;
}

// No type-the-email confirmation: that friction exists to slow an irreversible act,
// and this one is undone in a click. The button stays red — sessions end immediately.
export function DeactivateUserConfirmModal({ user, isPending, onClose, onConfirm }: DeactivateUserConfirmModalProps) {
    const [successorManagerId, setSuccessorManagerId] = useState<string | null>(null);

    // A manager's portfolio must land on someone still able to act on it. Admins
    // hold no property access, so an unassigned property would have no way back.
    const needsSuccessor = user?.role === 'MANAGER';
    const managersQuery = useManagers(needsSuccessor);
    const successorOptions = (managersQuery.data ?? [])
        .filter(m => m.id !== user?.id)
        .map(m => ({ value: m.id, label: `${m.name} (${m.email})` }));

    // Clear the picker when the modal switches to a different user. Adjusting state
    // during render (rather than in an effect) avoids a cascading re-render.
    const [pickedFor, setPickedFor] = useState<string | null>(null);
    if ((user?.id ?? null) !== pickedFor) {
        setPickedFor(user?.id ?? null);
        setSuccessorManagerId(null);
    }

    return (
        <BrandedModal
            opened={user !== null}
            onClose={onClose}
            tone='neutral'
            eyebrow='USER · DEACTIVATE'
            title='Deactivate user'
            footer={
                <>
                    <Button variant='subtle' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        color='red'
                        loading={isPending}
                        disabled={needsSuccessor && !successorManagerId}
                        onClick={() => onConfirm(successorManagerId ?? undefined)}
                    >
                        Deactivate user
                    </Button>
                </>
            }
        >
            <Stack>
                <Text size='sm'>
                    Deactivate <strong>{user?.name}</strong>? They will be signed out immediately and cannot sign in
                    until reactivated. Bookings, feedback, and tickets are kept. You can reactivate them at any time.
                </Text>

                {needsSuccessor && (
                    <>
                        <Alert variant='light' color='orange' icon={<IconAlertTriangle size={16} />}>
                            Choose who inherits their properties and open tickets. Reactivating {user?.name} later will
                            not take those properties back.
                        </Alert>
                        <Select
                            label='Successor manager'
                            placeholder={managersQuery.isLoading ? 'Loading managers…' : 'Select a manager'}
                            data={successorOptions}
                            withAsterisk
                            searchable
                            nothingFoundMessage='No other managers available'
                            disabled={managersQuery.isLoading}
                            value={successorManagerId}
                            onChange={setSuccessorManagerId}
                        />
                    </>
                )}
            </Stack>
        </BrandedModal>
    );
}
