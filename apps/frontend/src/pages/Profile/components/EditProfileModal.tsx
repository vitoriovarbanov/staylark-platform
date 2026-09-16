import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Box, Button, Group, Stack, TagsInput, Text, TextInput, Textarea } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { Dropzone, MIME_TYPES, type FileRejection } from '@mantine/dropzone';
import { useReducedMotion } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCamera, IconLoader2 } from '@tabler/icons-react';
import { UpdateMyProfileSchema, cloudinaryUrl, type MyProfileFields } from '@staylark/contract';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { useAuth } from '@/contexts/auth-context';
import { useUpdateMyProfile } from '@/hooks/api/use-my-profile';
import { authClient } from '@/lib/auth-client';
import { uploadToCloudinary } from '@/lib/upload';
import classes from './EditProfileModal.module.css';

const FORM_ID = 'edit-profile-form';
const BIO_MAX = 280;
const NAME_MAX = 80;
const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
/** Keep in sync with the helper copy below and what Cloudinary/the avatar pipeline supports. */
const AVATAR_ACCEPT = [MIME_TYPES.jpeg, MIME_TYPES.png, MIME_TYPES.webp];

/**
 * Validate the contract-owned fields (bio/homeCity/languages/phone) via the shared schema,
 * then layer on the Better Auth `name` field that lives on this same modal but isn't part
 * of the contract. Returns the merged Mantine error map.
 */
const contractResolver = zodResolver(UpdateMyProfileSchema);
function validateProfileForm(values: ProfileFormValues): Record<string, string> {
    const errors = contractResolver(values) as Record<string, string>;
    const name = values.name.trim();
    if (name.length === 0) errors.name = 'Display name is required';
    else if (name.length > NAME_MAX) errors.name = `Keep it under ${NAME_MAX} characters`;
    return errors;
}

/** Common languages seeded into the picker; the user's own values are merged in below. */
const COMMON_LANGUAGES = [
    'English',
    'Bulgarian',
    'Spanish',
    'Portuguese',
    'French',
    'German',
    'Italian',
    'Dutch',
    'Greek',
    'Romanian',
    'Czech',
    'Hungarian',
    'Polish',
    'Croatian',
    'Turkish',
    'Arabic',
    'Russian',
    'Ukrainian',
    'Swedish',
    'Danish',
    'Mandarin',
    'Japanese'
];

/** App-owned profile fields validated by the contract schema, plus identity Better Auth owns. */
interface ProfileFormValues {
    bio: string;
    homeCity: string;
    languages: string[];
    phone: string;
    name: string;
    image: string;
}

interface EditProfileModalProps {
    opened: boolean;
    onClose: () => void;
    profile: MyProfileFields;
}

function extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
    }
    return 'Something went wrong. Please try again.';
}

export function EditProfileModal({ opened, onClose, profile }: EditProfileModalProps) {
    const reduced = useReducedMotion();
    const { user } = useAuth();
    const updateMyProfile = useUpdateMyProfile();

    const [avatarUploading, setAvatarUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    // Validate the contract-owned fields plus the locally-managed identity fields.
    const form = useForm<ProfileFormValues>({
        validateInputOnBlur: true,
        validate: validateProfileForm,
        initialValues: {
            bio: '',
            homeCity: '',
            languages: [],
            phone: '',
            name: '',
            image: ''
        }
    });

    // Reset to current values whenever the modal (re)opens.
    useEffect(() => {
        if (!opened) return;
        form.setValues({
            bio: profile.bio ?? '',
            homeCity: profile.homeCity ?? '',
            languages: profile.languages ?? [],
            phone: profile.phone ?? '',
            name: user?.name ?? '',
            image: user?.image ?? ''
        });
        form.resetDirty();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened, profile, user?.name, user?.image]);

    // Revoke any pending object URL on unmount.
    useEffect(
        () => () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        },
        []
    );

    // Merge seed languages with the user's existing values so nothing is lost on edit.
    const languageOptions = useMemo(() => {
        const merged = new Set<string>([...COMMON_LANGUAGES, ...(profile.languages ?? []), ...form.values.languages]);
        return [...merged].sort((a, b) => a.localeCompare(b));
    }, [profile.languages, form.values.languages]);

    const bioLength = form.values.bio.length;

    const handleAvatarDrop = async (files: File[]) => {
        const file = files[0];
        if (!file) return;

        const preview = URL.createObjectURL(file);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = preview;
        // Show the chosen image instantly while the (possibly multi-second) upload runs.
        setPreviewUrl(preview);

        setAvatarUploading(true);
        try {
            const uploaded = await uploadToCloudinary(file, 'avatars');
            form.setFieldValue('image', uploaded.url);
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Avatar upload failed',
                message: extractErrorMessage(error)
            });
        } finally {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            setPreviewUrl(null);
            setAvatarUploading(false);
        }
    };

    const handleAvatarReject = (rejections: FileRejection[]) => {
        const codes = new Set(rejections.flatMap(r => r.errors.map(e => e.code)));
        let message = 'That file can’t be used as a photo.';
        if (codes.has('file-too-large')) message = 'Image must be 5 MB or smaller.';
        else if (codes.has('file-invalid-type')) message = 'Use a JPG, PNG, or WebP image.';
        else if (codes.has('too-many-files')) message = 'Please choose a single image.';
        notifications.show({ color: 'red', title: 'Image rejected', message });
    };

    const handleClose = () => {
        if (saving || avatarUploading) return;
        onClose();
    };

    const handleSubmit = form.onSubmit(async values => {
        setSaving(true);
        try {
            // 1. Identity fields Better Auth owns — only send changed keys so the session store syncs.
            const identityPayload: { name?: string; image?: string } = {};
            if (values.name.trim() !== (user?.name ?? '')) identityPayload.name = values.name.trim();
            if (values.image !== (user?.image ?? '')) identityPayload.image = values.image;

            if (Object.keys(identityPayload).length > 0) {
                const result = await authClient.updateUser(identityPayload);
                if (result.error) {
                    throw new Error(result.error.message ?? 'Failed to update profile identity');
                }
            }

            // 2. App-owned profile fields via PATCH /me/profile.
            await updateMyProfile.mutateAsync({
                bio: values.bio.trim() ? values.bio.trim() : null,
                homeCity: values.homeCity ? values.homeCity : null,
                languages: values.languages,
                phone: values.phone.trim() ? values.phone.trim() : null
            });

            notifications.show({ message: 'Profile updated', color: 'green' });
            onClose();
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Update failed',
                message: extractErrorMessage(error)
            });
        } finally {
            setSaving(false);
        }
    });

    // Prefer the instant local preview while uploading; fall back to the saved image.
    const avatarSrc = previewUrl
        ? previewUrl
        : form.values.image
          ? cloudinaryUrl(form.values.image, { width: 160, height: 160, crop: 'fill' })
          : undefined;
    const avatarName = form.values.name || user?.name || '';

    return (
        <BrandedModal
            opened={opened}
            onClose={handleClose}
            eyebrow='Your profile'
            title='Edit profile'
            size='lg'
            footer={
                <>
                    <Button variant='subtle' color='gray' onClick={handleClose} disabled={saving || avatarUploading}>
                        Cancel
                    </Button>
                    <Button type='submit' form={FORM_ID} loading={saving} disabled={avatarUploading}>
                        Save changes
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={handleSubmit}>
                <Stack gap='xl'>
                    {/* --- Identity: avatar + name --- */}
                    <section className={classes.section}>
                        <span className={classes.sectionLabel}>Identity</span>
                        <Group align='flex-start' gap='lg' wrap='nowrap' className={classes.identityRow}>
                            <Dropzone
                                onDrop={handleAvatarDrop}
                                onReject={handleAvatarReject}
                                accept={AVATAR_ACCEPT}
                                maxSize={AVATAR_MAX_SIZE}
                                maxFiles={1}
                                multiple={false}
                                disabled={avatarUploading || saving}
                                className={classes.avatarDropzone}
                                data-reduced={reduced ? 'true' : undefined}
                            >
                                <Box pos='relative'>
                                    <Avatar
                                        src={avatarSrc}
                                        name={avatarName}
                                        size={96}
                                        radius='50%'
                                        color='amber'
                                        className={classes.avatar}
                                    />
                                    <span className={classes.avatarBadge} aria-hidden>
                                        {avatarUploading ? (
                                            <IconLoader2 size={16} className={classes.spin} />
                                        ) : (
                                            <IconCamera size={16} />
                                        )}
                                    </span>
                                </Box>
                            </Dropzone>

                            <Stack gap={6} className={classes.identityFields}>
                                <TextInput
                                    label='Display name'
                                    placeholder='Your name'
                                    withAsterisk
                                    maxLength={NAME_MAX}
                                    {...form.getInputProps('name')}
                                />
                                <Text size='xs' c='dimmed'>
                                    {avatarUploading
                                        ? 'Uploading photo…'
                                        : 'Click the avatar to upload a new photo (JPG, PNG, WebP · max 5MB).'}
                                </Text>
                            </Stack>
                        </Group>
                    </section>

                    {/* --- About: bio --- */}
                    <section className={classes.section}>
                        <span className={classes.sectionLabel}>About</span>
                        <Textarea
                            label='Bio'
                            placeholder='Tell a little about yourself…'
                            autosize
                            minRows={3}
                            maxRows={6}
                            maxLength={BIO_MAX}
                            {...form.getInputProps('bio')}
                        />
                        <div className={classes.counter} data-near-limit={bioLength >= BIO_MAX ? 'true' : undefined}>
                            {bioLength}/{BIO_MAX}
                        </div>
                    </section>

                    {/* --- Details: home city, phone, languages --- */}
                    <section className={classes.section}>
                        <span className={classes.sectionLabel}>Details</span>
                        <Stack gap='md'>
                            <Group grow align='flex-start'>
                                <TextInput
                                    label='Home city'
                                    placeholder='Where you’re based'
                                    maxLength={100}
                                    {...form.getInputProps('homeCity')}
                                />
                                <TextInput
                                    label='Phone'
                                    placeholder='+359 88 123 4567'
                                    inputMode='tel'
                                    maxLength={40}
                                    {...form.getInputProps('phone')}
                                />
                            </Group>
                            <TagsInput
                                label='Languages'
                                description='Up to 8 languages you speak — type and press Enter'
                                placeholder={form.values.languages.length ? undefined : 'Add languages'}
                                data={languageOptions}
                                clearable
                                maxTags={8}
                                {...form.getInputProps('languages')}
                            />
                        </Stack>
                    </section>
                </Stack>
            </form>
        </BrandedModal>
    );
}
