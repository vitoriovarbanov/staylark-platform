import { Button, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Invitation } from '@staylark/contract';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { useRevokeInvitation } from '@/hooks/api/use-invitations';

function errorMessage(err: unknown, fallback: string): string {
    return (err as { message?: string })?.message ?? fallback;
}

interface RevokeInvitationConfirmModalProps {
    invitation: Invitation | null;
    onClose: () => void;
}

export function RevokeInvitationConfirmModal({ invitation, onClose }: RevokeInvitationConfirmModalProps) {
    const revokeMutation = useRevokeInvitation();

    const handleConfirm = () => {
        if (!invitation) return;
        revokeMutation.mutate(invitation.id, {
            onSuccess: () => {
                notifications.show({ color: 'green', message: 'Invitation revoked.' });
                onClose();
            },
            onError: err =>
                notifications.show({ color: 'red', message: errorMessage(err, 'Failed to revoke invitation.') })
        });
    };

    return (
        <BrandedModal
            opened={invitation !== null}
            onClose={onClose}
            tone='urgent'
            eyebrow='INVITE · REVOKE'
            title='Revoke invitation'
            footer={
                <>
                    <Button variant='subtle' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button color='red' loading={revokeMutation.isPending} onClick={handleConfirm}>
                        Revoke invitation
                    </Button>
                </>
            }
        >
            <Stack>
                <Text size='sm'>
                    Revoke invitation for <strong>{invitation?.email}</strong>? The link will stop working.
                </Text>
            </Stack>
        </BrandedModal>
    );
}
