import { useState } from 'react';
import {
    Alert,
    Anchor,
    Button,
    Group,
    List,
    Loader,
    Modal,
    ScrollArea,
    Stack,
    Table,
    Text,
    ThemeIcon
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import type { FileRejection } from '@mantine/dropzone';
import {
    IconAlertTriangle,
    IconCheck,
    IconDownload,
    IconFileSpreadsheet,
    IconUpload,
    IconX
} from '@tabler/icons-react';
import { IMPORT_MAX_FILE_BYTES, IMPORT_MAX_ROWS } from '@staylark/contract';
import type { ImportRowError } from '@staylark/contract';
import { useDownloadTemplate, useImportProperties } from '../../../../hooks/api/use-properties';
import { downloadBlob } from '../../../../lib/download-blob';

const MAX_FILE_MB = Math.round(IMPORT_MAX_FILE_BYTES / (1024 * 1024));

/** Dropzone rejects a file before `onDrop` ever runs, so each rule needs its own wording. */
function rejectionMessage(rejections: FileRejection[]): string {
    const code = rejections[0]?.errors[0]?.code;
    if (code === 'file-too-large') {
        return `That file is larger than ${MAX_FILE_MB} MB. Split it into smaller files and import them one at a time.`;
    }
    if (code === 'too-many-files') return 'Please upload one file at a time.';
    return 'That file type is not supported. Upload the .xlsx template or a .csv file.';
}

interface BulkImportModalProps {
    opened: boolean;
    onClose: () => void;
}

/**
 * The axios interceptor in lib/api.ts rejects with a FLAT
 * `{ status, message, errorCode, details }` — not the raw axios error — so there is
 * no `error.response` to read here. Same shape BookingConfirmationModal uses.
 */
interface NormalizedApiError {
    status?: number;
    message?: string;
    errorCode?: string;
    details?: { rowCount?: number; errors?: ImportRowError[] };
}

/** Pull the row errors out of a 422. Anything else is a generic failure. */
function readRowErrors(error: unknown): ImportRowError[] | null {
    const normalized = error as NormalizedApiError;
    if (normalized?.errorCode !== 'IMPORT_VALIDATION_FAILED') return null;
    return normalized.details?.errors ?? [];
}

function readMessage(error: unknown): string {
    return (error as NormalizedApiError)?.message ?? 'The import failed. Please try again.';
}

function errorsToCsv(errors: ImportRowError[]): string {
    const escape = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['row', 'column', 'value', 'message'].join(',');
    const lines = errors.map(e => [e.row, e.column, e.value, e.message].map(escape).join(','));
    return [header, ...lines].join('\n');
}

export function BulkImportModal({ opened, onClose }: BulkImportModalProps) {
    const [created, setCreated] = useState<number | null>(null);
    const [rejected, setRejected] = useState<string | null>(null);
    const downloadTemplate = useDownloadTemplate();
    const importProperties = useImportProperties();

    const rowErrors = importProperties.error ? readRowErrors(importProperties.error) : null;

    const handleClose = () => {
        importProperties.reset();
        setCreated(null);
        setRejected(null);
        onClose();
    };

    const handleDrop = (files: File[]) => {
        const file = files[0];
        if (!file) return;
        setRejected(null);
        importProperties.reset();
        importProperties.mutate(file, { onSuccess: result => setCreated(result.created) });
    };

    const downloadErrors = () => {
        if (!rowErrors) return;
        const blob = new Blob([errorsToCsv(rowErrors)], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, 'import-errors.csv');
    };

    return (
        <Modal opened={opened} onClose={handleClose} title='Bulk import properties' size='lg' centered>
            <Stack gap='md'>
                {created !== null ? (
                    <Alert
                        color='green'
                        icon={<IconCheck size={18} />}
                        title={`${created} ${created === 1 ? 'property' : 'properties'} created`}
                    >
                        Images are being processed and will appear shortly.
                    </Alert>
                ) : importProperties.isPending ? (
                    <Stack align='center' gap='xs' py='xl'>
                        <Loader />
                        <Text fw={600}>Checking image links…</Text>
                        <Text size='sm' c='var(--mantine-other-text-secondary)' ta='center'>
                            Every photo URL is verified before anything is created. A large file can take a few moments.
                        </Text>
                    </Stack>
                ) : (
                    <>
                        <Stack gap={6}>
                            <Text size='sm'>
                                Download the template, fill in one row per property, then upload it here. Every property
                                you import is assigned to you.
                            </Text>
                            <List size='sm' spacing={2} c='var(--mantine-other-text-secondary)'>
                                <List.Item>Up to {IMPORT_MAX_ROWS} properties per file.</List.Item>
                                <List.Item>
                                    Photo URLs must be public https:// links — we re-host them for you.
                                </List.Item>
                                <List.Item>
                                    If any row is invalid the whole file is rejected, so nothing is half-imported.
                                </List.Item>
                            </List>
                        </Stack>

                        <Button
                            variant='light'
                            leftSection={<IconDownload size={16} />}
                            onClick={() => downloadTemplate.mutate()}
                            loading={downloadTemplate.isPending}
                        >
                            Download template
                        </Button>

                        <Dropzone
                            onDrop={handleDrop}
                            onReject={rejections => setRejected(rejectionMessage(rejections))}
                            maxSize={IMPORT_MAX_FILE_BYTES}
                            maxFiles={1}
                            accept={{
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                'text/csv': ['.csv']
                            }}
                        >
                            <Group justify='center' gap='md' mih={120} style={{ pointerEvents: 'none' }}>
                                <Dropzone.Accept>
                                    <ThemeIcon variant='light' size='lg'>
                                        <IconUpload size={20} />
                                    </ThemeIcon>
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <ThemeIcon variant='light' color='red' size='lg'>
                                        <IconX size={20} />
                                    </ThemeIcon>
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <ThemeIcon variant='light' size='lg'>
                                        <IconFileSpreadsheet size={20} />
                                    </ThemeIcon>
                                </Dropzone.Idle>
                                <Stack gap={2}>
                                    <Text fw={600}>Drop your file here, or click to choose</Text>
                                    <Text size='sm' c='var(--mantine-other-text-secondary)'>
                                        .xlsx or .csv, up to {MAX_FILE_MB} MB
                                    </Text>
                                </Stack>
                            </Group>
                        </Dropzone>

                        {rejected && (
                            <Alert color='red' icon={<IconAlertTriangle size={18} />} title='File not accepted'>
                                {rejected}
                            </Alert>
                        )}
                    </>
                )}

                {rowErrors !== null && (
                    <Stack gap='xs'>
                        <Alert color='red' icon={<IconAlertTriangle size={18} />} title='No properties were created'>
                            {readMessage(importProperties.error)} Fix the rows below and upload the file again.
                        </Alert>

                        <Group justify='space-between'>
                            <Text size='sm' fw={600}>
                                {rowErrors.length} {rowErrors.length === 1 ? 'problem' : 'problems'}
                            </Text>
                            <Anchor component='button' type='button' size='sm' onClick={downloadErrors}>
                                Download errors as CSV
                            </Anchor>
                        </Group>

                        <ScrollArea.Autosize mah={280}>
                            <Table striped highlightOnHover stickyHeader>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th w={70}>Row</Table.Th>
                                        <Table.Th w={140}>Column</Table.Th>
                                        <Table.Th>Problem</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {rowErrors.map((e, i) => (
                                        <Table.Tr key={`${e.row}-${e.column}-${i}`}>
                                            <Table.Td>{e.row}</Table.Td>
                                            <Table.Td>{e.column ?? '—'}</Table.Td>
                                            <Table.Td>
                                                <Text size='sm'>{e.message}</Text>
                                                {e.value ? (
                                                    <Text size='xs' c='var(--mantine-other-text-secondary)'>
                                                        Got: {e.value}
                                                    </Text>
                                                ) : null}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea.Autosize>
                    </Stack>
                )}

                {importProperties.isError && rowErrors === null && (
                    <Alert color='red' icon={<IconAlertTriangle size={18} />} title='Import failed'>
                        {readMessage(importProperties.error)}
                    </Alert>
                )}

                <Group justify='flex-end'>
                    <Button variant='default' onClick={handleClose}>
                        {created !== null ? 'Done' : 'Close'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
