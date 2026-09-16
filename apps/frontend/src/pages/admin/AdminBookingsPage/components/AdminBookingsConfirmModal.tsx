import { Modal, Stack, Checkbox, Text, Button, Group, ScrollArea, Divider } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { BookingWithRelations } from '@/hooks/api/use-bookings';

interface Props {
    opened: boolean;
    bookings: BookingWithRelations[];
    onClose: () => void;
    onConfirm: (notify: boolean) => Promise<void>;
    submitting: boolean;
}

export function AdminBookingsConfirmModal({ opened, bookings, onClose, onConfirm, submitting }: Props) {
    const [notify, setNotify] = useState(true);
    const isBulk = bookings.length > 1;
    const title = isBulk ? `Confirm ${bookings.length} bookings?` : 'Confirm this booking?';

    return (
        <Modal opened={opened} onClose={onClose} title={title} size='md' centered>
            <Stack gap='md'>
                {isBulk ? (
                    <>
                        <Text size='sm' c='dimmed'>
                            The following bookings will be confirmed:
                        </Text>
                        <ScrollArea.Autosize mah={260}>
                            <Stack gap={6}>
                                {bookings.map(b => (
                                    <Text key={b.id} size='sm'>
                                        <strong>{b.user?.name ?? '—'}</strong> · {b.property.title} ·{' '}
                                        {dayjs(b.checkIn).format('D MMM YYYY')} →{' '}
                                        {dayjs(b.checkOut).format('D MMM YYYY')}
                                    </Text>
                                ))}
                            </Stack>
                        </ScrollArea.Autosize>
                    </>
                ) : (
                    bookings[0] && (
                        <Text size='sm'>
                            Confirm <strong>{bookings[0].user?.name ?? 'this guest'}</strong>'s stay at{' '}
                            <strong>{bookings[0].property.title}</strong>?
                        </Text>
                    )
                )}

                <Divider />
                <Checkbox
                    label='Notify guest by email'
                    checked={notify}
                    onChange={e => setNotify(e.currentTarget.checked)}
                />
                <Group justify='flex-end' gap='xs'>
                    <Button variant='subtle' onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button color='green' loading={submitting} onClick={() => onConfirm(notify)}>
                        {isBulk ? `Confirm ${bookings.length}` : 'Confirm'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
