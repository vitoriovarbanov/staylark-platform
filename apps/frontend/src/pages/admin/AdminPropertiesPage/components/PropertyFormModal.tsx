import { Stack, TextInput, Textarea, Select, NumberInput, TagsInput, Group, Button, Text } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { CreatePropertySchema } from '@staylark/contract';
import type { Property, CreateProperty } from '@staylark/contract';
import { useEffect, useMemo, useRef } from 'react';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { deleteFromCloudinary, type UploadedImage } from '@/lib/upload';
import { useManagers } from '@/hooks/api/use-managers';

const FORM_ID = 'property-form';

type PropertyFormValues = Omit<CreateProperty, 'photos'> & {
    photos: UploadedImage[];
};

const UNASSIGNED = '__unassigned__';

const INITIAL_VALUES: PropertyFormValues = {
    title: '',
    description: '',
    type: 'APARTMENT',
    city: '',
    address: '',
    nightlyPrice: 0,
    maxGuests: 4,
    amenities: [],
    photos: [],
    managerId: null
};

interface PropertyFormModalProps {
    opened: boolean;
    property: Property | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (values: CreateProperty) => void;
}

export function PropertyFormModal({ opened, property, isSaving, onClose, onSubmit }: PropertyFormModalProps) {
    const form = useForm<PropertyFormValues>({
        validate: zodResolver(CreatePropertySchema.omit({ photos: true })),
        initialValues: INITIAL_VALUES
    });

    const managersQuery = useManagers(opened);
    const managerOptions = useMemo(
        () => [
            { value: UNASSIGNED, label: 'Unassigned' },
            ...(managersQuery.data ?? []).map(m => ({
                value: m.id,
                label: `${m.name} — ${m.email} (${m.role})`
            }))
        ],
        [managersQuery.data]
    );

    const pendingDeletions = useRef<string[]>([]);

    useEffect(() => {
        if (opened && property) {
            form.setValues({
                title: property.title,
                description: property.description,
                type: property.type,
                city: property.city,
                address: property.address,
                nightlyPrice: property.nightlyPrice,
                amenities: property.amenities,
                photos: property.photos.map(url => ({ url, publicId: '' })),
                managerId: property.managerId ?? null
            });
            pendingDeletions.current = [];
        } else if (opened) {
            form.reset();
            pendingDeletions.current = [];
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, property]);

    const handleImageRemove = (imageUrl: string) => {
        pendingDeletions.current.push(imageUrl);
    };

    const handleClose = () => {
        pendingDeletions.current = [];
        onClose();
    };

    const handleSubmit = form.onSubmit(async values => {
        onSubmit({
            ...values,
            photos: values.photos.map(img => img.url)
        });

        // Delete removed images from Cloudinary after successful submit
        const deletions = pendingDeletions.current;
        pendingDeletions.current = [];
        await Promise.allSettled(deletions.map(url => deleteFromCloudinary(url)));
    });

    return (
        <BrandedModal
            opened={opened}
            onClose={handleClose}
            eyebrow={property ? 'PROPERTY · EDIT' : 'PROPERTY · NEW'}
            title={property ? property.title || 'Edit Property' : 'Create Property'}
            footer={
                <>
                    <Button variant='subtle' onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type='submit' form={FORM_ID} loading={isSaving}>
                        {property ? 'Update' : 'Create'}
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={handleSubmit}>
                <Stack>
                    <TextInput
                        label='Title'
                        placeholder='Cozy Apartment in Sofia'
                        withAsterisk
                        {...form.getInputProps('title')}
                    />
                    <Textarea
                        label='Description'
                        placeholder='A beautiful property...'
                        withAsterisk
                        minRows={3}
                        {...form.getInputProps('description')}
                    />
                    <Group grow>
                        <Select
                            label='Type'
                            data={[
                                { value: 'APARTMENT', label: 'Apartment' },
                                { value: 'HOUSE', label: 'House' },
                                { value: 'HOTEL', label: 'Hotel' }
                            ]}
                            withAsterisk
                            {...form.getInputProps('type')}
                        />
                        <TextInput label='City' placeholder='Sofia' withAsterisk {...form.getInputProps('city')} />
                    </Group>
                    <TextInput
                        label='Address'
                        placeholder='123 Main Street'
                        withAsterisk
                        {...form.getInputProps('address')}
                    />
                    <NumberInput
                        label='Nightly Price (€)'
                        placeholder='100'
                        min={1}
                        withAsterisk
                        {...form.getInputProps('nightlyPrice')}
                    />
                    <Select
                        label='Manager'
                        description='Assign a manager so they can view bookings and manage pricing overrides for this property.'
                        placeholder={managersQuery.isLoading ? 'Loading managers…' : 'Unassigned'}
                        data={managerOptions}
                        value={form.values.managerId ?? UNASSIGNED}
                        onChange={value =>
                            form.setFieldValue('managerId', value === UNASSIGNED || value === null ? null : value)
                        }
                        searchable
                        clearable={false}
                        disabled={managersQuery.isLoading}
                    />
                    <TagsInput
                        label='Amenities'
                        placeholder='Type and press Enter'
                        {...form.getInputProps('amenities')}
                    />

                    <Text fw={500} size='sm'>
                        Photos
                    </Text>
                    <ImageUpload
                        value={form.values.photos}
                        onChange={images => form.setFieldValue('photos', images)}
                        onRemove={handleImageRemove}
                        disabled={isSaving}
                    />
                </Stack>
            </form>
        </BrandedModal>
    );
}
