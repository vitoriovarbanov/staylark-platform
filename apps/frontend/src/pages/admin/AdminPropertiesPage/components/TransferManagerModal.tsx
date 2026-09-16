import { useState } from 'react';
import { Alert, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { Property } from '@staylark/contract';
import { useManagers } from '@/hooks/api/use-managers';
import { useAuth } from '@/contexts/auth-context';

interface TransferManagerModalProps {
    property: Property | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (managerId: string) => void;
}

/**
 * Hands a property to another manager. Deliberately explicit about the
 * consequence: the transfer is immediate and one-way from the caller's side —
 * once it lands they can no longer see the property, its bookings, or its
 * tickets, and only the new manager can hand it back.
 */
export function TransferManagerModal({ property, isSaving, onClose, onSubmit }: TransferManagerModalProps) {
    const { user } = useAuth();
    const [managerId, setManagerId] = useState<string | null>(null);
    const managersQuery = useManagers(property !== null);

    // You cannot transfer a property to yourself — the backend rejects it too.
    const options = (managersQuery.data ?? [])
        .filter(m => m.id !== user?.id)
        .map(m => ({ value: m.id, label: `${m.name} (${m.email})` }));

    const handleClose = () => {
        setManagerId(null);
        onClose();
    };

    return (
        <Modal opened={property !== null} onClose={handleClose} title='Change manager' centered>
            <Stack>
                <Text size='sm'>
                    Hand <strong>{property?.title}</strong> to another manager.
                </Text>

                <Select
                    label='New manager'
                    placeholder={managersQuery.isLoading ? 'Loading managers…' : 'Select a manager'}
                    data={options}
                    value={managerId}
                    onChange={setManagerId}
                    searchable
                    nothingFoundMessage='No other managers'
                    disabled={managersQuery.isLoading}
                />

                <Alert variant='light' color='blue' icon={<IconInfoCircle size={16} />}>
                    The property, its open tickets and its pricing rules move immediately. You will lose access to it —
                    only the new manager can transfer it back.
                </Alert>

                <Group justify='flex-end'>
                    <Button variant='default' onClick={handleClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={() => managerId && onSubmit(managerId)} disabled={!managerId} loading={isSaving}>
                        Transfer
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
