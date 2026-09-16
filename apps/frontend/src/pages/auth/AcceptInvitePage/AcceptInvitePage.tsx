import { useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { TextInput, PasswordInput, Button, Stack, Alert, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm, zodResolver } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import type { InvitationPublic } from '@staylark/contract';
import { SignUpSchema, StrictSignUpSchema } from '@staylark/contract';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';
import { adminHomePath } from '@/lib/admin-home';
import { useInvitation, useAcceptInvitation } from '@/hooks/api/use-invitation-public';

// The accept page has a single password field (no confirm), so validate against
// a password-only object schema ({ name, password }) — no confirmPassword. Picking
// from the sign-up schema reuses the same dev/prod password-strength split without
// importing zod directly in the frontend.
const AcceptFormSchema = (import.meta.env.PROD ? StrictSignUpSchema : SignUpSchema).pick({
    name: true,
    password: true
});

export function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const { data: invitation, isLoading, isError } = useInvitation(token);

    // Loading — token present, lookup in flight.
    if (token && isLoading) {
        return (
            <AuthLayout title='Checking your invitation'>
                <Center py='xl'>
                    <Loader />
                </Center>
            </AuthLayout>
        );
    }

    // No token / invalid / expired — terminal state, never render the form.
    if (!token || isError || !invitation) {
        return (
            <AuthLayout title='Invitation invalid or expired'>
                <Stack>
                    <Alert icon={<IconAlertCircle size={16} />} color='red' variant='light'>
                        This invitation link is no longer valid — ask an admin to send a new one.
                    </Alert>
                    <Button variant='light' fullWidth component={Link} to='/sign-in'>
                        Go to sign in
                    </Button>
                </Stack>
            </AuthLayout>
        );
    }

    return <AcceptInviteForm token={token} invitation={invitation} />;
}

function AcceptInviteForm({ token, invitation }: { token: string; invitation: InvitationPublic }) {
    const acceptInvitation = useAcceptInvitation(token);
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        validate: zodResolver(AcceptFormSchema),
        initialValues: { name: invitation.name, password: '' }
    });

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true);
        try {
            await acceptInvitation.mutateAsync({
                password: values.password,
                name: values.name.trim() || invitation.name
            });
            // Full-page redirect (not react-router navigate): the session was
            // established via axios, so the reactive `authClient.useSession()` store
            // that AuthProvider + the route guards read is still stale (logged-out).
            // A hard load re-bootstraps the app and re-fetches the now-valid session
            // from the cookie + persisted Bearer token, avoiding a bounce to sign-in.
            const isStaff = invitation.role === 'ADMIN' || invitation.role === 'MANAGER';
            window.location.replace(isStaff ? adminHomePath(invitation.role) : '/');
        } catch {
            setSubmitting(false);
            notifications.show({
                color: 'red',
                message: 'Could not accept this invitation — it may have expired. Ask an admin to resend.'
            });
        }
    };

    return (
        <AuthLayout
            title={`${invitation.inviterName ?? 'An admin'} invited you to Staylark`}
            subtitle={`Set your password to join as ${invitation.role}.`}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput label='Email' value={invitation.email} disabled autoComplete='email' />
                    <TextInput
                        label='Full name'
                        placeholder='Your name'
                        autoComplete='name'
                        {...form.getInputProps('name')}
                    />
                    <PasswordInput
                        label='Password'
                        placeholder='At least 8 characters'
                        autoComplete='new-password'
                        {...form.getInputProps('password')}
                    />
                    <Button type='submit' fullWidth loading={submitting}>
                        Accept invitation
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
}
