import { useState, useCallback } from 'react';
import { Group, Text, Image, ActionIcon, SimpleGrid, Stack, Progress, Box } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileRejection } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconPhoto, IconX, IconTrash } from '@tabler/icons-react';
import { cloudinaryUrl } from '@staylark/contract';
import { uploadToCloudinary } from '../../lib/upload';
import type { UploadedImage } from '../../lib/upload';
import classes from './ImageUpload.module.css';

const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadProps {
    value: UploadedImage[];
    onChange: (images: UploadedImage[]) => void;
    onRemove?: (imageUrl: string) => void;
    disabled?: boolean;
}

interface UploadingFile {
    id: string;
    name: string;
    preview: string;
    progress: number;
}

export function ImageUpload({ value, onChange, onRemove, disabled }: ImageUploadProps) {
    const [uploading, setUploading] = useState<UploadingFile[]>([]);

    const remainingSlots = MAX_FILES - value.length - uploading.length;

    const handleDrop = useCallback(
        async (files: File[]) => {
            const filesToUpload = files.slice(0, remainingSlots);

            const newUploading: UploadingFile[] = filesToUpload.map(file => ({
                id: crypto.randomUUID(),
                name: file.name,
                preview: URL.createObjectURL(file),
                progress: 0
            }));
            setUploading(prev => [...prev, ...newUploading]);

            const results: UploadedImage[] = [];
            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                const uploadEntry = newUploading[i];
                try {
                    setUploading(prev => prev.map(u => (u.id === uploadEntry.id ? { ...u, progress: 50 } : u)));

                    const result = await uploadToCloudinary(file);
                    results.push(result);

                    setUploading(prev => prev.map(u => (u.id === uploadEntry.id ? { ...u, progress: 100 } : u)));
                } catch (error) {
                    notifications.show({
                        title: 'Upload failed',
                        message: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        color: 'red'
                    });
                } finally {
                    URL.revokeObjectURL(uploadEntry.preview);
                    setUploading(prev => prev.filter(u => u.id !== uploadEntry.id));
                }
            }

            if (results.length > 0) {
                onChange([...value, ...results]);
            }
        },
        [value, onChange, remainingSlots]
    );

    const handleRemove = useCallback(
        (imageUrl: string) => {
            onRemove?.(imageUrl);
            onChange(value.filter(img => img.url !== imageUrl));
        },
        [value, onChange, onRemove]
    );

    const handleReject = useCallback((fileRejections: FileRejection[]) => {
        fileRejections.forEach(({ file, errors }) => {
            notifications.show({
                title: 'File rejected',
                message: `${file.name}: ${errors.map(e => e.message).join(', ')}`,
                color: 'red'
            });
        });
    }, []);

    return (
        <Stack gap='sm'>
            {remainingSlots > 0 && (
                <Dropzone
                    onDrop={handleDrop}
                    onReject={handleReject}
                    maxSize={MAX_SIZE}
                    accept={IMAGE_MIME_TYPE}
                    maxFiles={remainingSlots}
                    disabled={disabled || uploading.length > 0}
                    className={classes.dropzone}
                >
                    <Group justify='center' gap='xl' mih={120} style={{ pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                            <IconUpload size={52} stroke={1.5} />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX size={52} stroke={1.5} />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <IconPhoto size={52} stroke={1.5} />
                        </Dropzone.Idle>

                        <div>
                            <Text size='xl' inline>
                                Drag images here or click to select
                            </Text>
                            <Text size='sm' c='dimmed' inline mt={7}>
                                {value.length}/{MAX_FILES} images — max 5MB each (JPG, PNG, WebP)
                            </Text>
                        </div>
                    </Group>
                </Dropzone>
            )}

            {remainingSlots <= 0 && uploading.length === 0 && (
                <Text size='sm' c='dimmed'>
                    Maximum {MAX_FILES} images reached. Remove an image to upload more.
                </Text>
            )}

            {uploading.length > 0 && (
                <Stack gap='xs'>
                    {uploading.map(u => (
                        <Group key={u.id} gap='sm'>
                            <Image src={u.preview} w={40} h={40} radius='sm' fit='cover' />
                            <Box style={{ flex: 1 }}>
                                <Text size='xs' truncate>
                                    {u.name}
                                </Text>
                                <Progress value={u.progress} size='sm' animated />
                            </Box>
                        </Group>
                    ))}
                </Stack>
            )}

            {value.length > 0 && (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing='sm'>
                    {value.map(img => (
                        <Box key={img.url} pos='relative' className={classes.preview}>
                            <Image
                                src={cloudinaryUrl(img.url, { width: 300, height: 200, crop: 'fill' })}
                                h={120}
                                radius='sm'
                                fit='cover'
                            />
                            <ActionIcon
                                className={classes.removeButton}
                                variant='filled'
                                color='red'
                                size='sm'
                                radius='xl'
                                onClick={() => handleRemove(img.url)}
                                disabled={disabled}
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Box>
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
}
