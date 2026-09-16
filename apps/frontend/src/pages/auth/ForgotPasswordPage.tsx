import { useState } from 'react';
import { Link } from 'react-router';
import { TextInput, Button, Stack, Alert, Anchor } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { ResetPasswordSchema } from '@staylark/contract';
import { authClient } from '@/lib/auth-client';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';

export function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm({
        validate: zodResolver(ResetPasswordSchema),
        initialValues: { email: '' }
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);
        const { error: authError } = await authClient.requestPasswordReset({
            email: values.email,
            redirectTo: '/reset-password'
        });
        setLoading(false);
        if (authError) {
            setError(authError.message ?? 'Request failed. Please try again.');
        } else {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <AuthLayout title='Check your email'>
                <Stack>
                    <Alert icon={<IconCheck size={16} />} color='green' variant='light'>
                        If an account exists with that email, we sent a password reset link. Check your inbox.
                    </Alert>
                    <Button variant='light' fullWidth component={Link} to='/sign-in'>
                        Back to Sign In
                    </Button>
                </Stack>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title='Forgot your password?'
            subtitle="Enter your email and we'll send you a reset link"
            footer={
                <>
                    Remember your password?{' '}
                    <Anchor component={Link} to='/sign-in' size='sm'>
                        Sign in
                    </Anchor>
                </>
            }
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color='red' variant='light'>
                            {error}
                        </Alert>
                    )}
                    <TextInput
                        label='Email'
                        placeholder='you@example.com'
                        autoComplete='email'
                        {...form.getInputProps('email')}
                    />
                    <Button type='submit' fullWidth loading={loading}>
                        Send reset link
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
}
