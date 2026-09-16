import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { PricingRule } from '@staylark/contract';

interface DeactivateConfirmModalProps {
    opened: boolean;
    override: PricingRule | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeactivateConfirmModal({
    opened,
    override,
    isPending,
    onClose,
    onConfirm
}: DeactivateConfirmModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title='Deactivate override' centered size='md'>
            <Stack>
                <Text size='sm'>
                    Deactivate override <strong>{override?.name}</strong>? It will stop affecting prices, but can be
                    reactivated later.
                </Text>
                <Group justify='flex-end'>
                    <Button variant='subtle' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button color='red' variant='light' loading={isPending} onClick={onConfirm}>
                        Deactivate
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
