import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { PasswordInput, Button, Stack, Alert } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { NewPasswordSchema, StrictNewPasswordSchema } from '@staylark/contract';

const PasswordFormSchema = import.meta.env.PROD ? StrictNewPasswordSchema : NewPasswordSchema;
import { authClient } from '@/lib/auth-client';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';

export function ResetPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const form = useForm({
        validate: zodResolver(PasswordFormSchema),
        initialValues: { password: '', confirmPassword: '' }
    });

    if (!token) {
        return (
            <AuthLayout title='Invalid link'>
                <Stack>
                    <Alert icon={<IconAlertCircle size={16} />} color='red' variant='light'>
                        This password reset link is invalid or has expired.
                    </Alert>
                    <Button variant='light' fullWidth component={Link} to='/forgot-password'>
                        Request a new link
                    </Button>
                </Stack>
            </AuthLayout>
        );
    }

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);
        const { error: authError } = await authClient.resetPassword({
            newPassword: values.password,
            token
        });
        setLoading(false);
        if (authError) {
            setError(authError.message ?? 'Reset failed. The link may have expired.');
        } else {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <AuthLayout title='Password reset!'>
                <Stack>
                    <Alert icon={<IconCheck size={16} />} color='green' variant='light'>
                        Your password has been reset successfully.
                    </Alert>
                    <Button fullWidth onClick={() => navigate('/sign-in')}>
                        Sign in with new password
                    </Button>
                </Stack>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title='Set new password' subtitle='Choose a strong password'>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color='red' variant='light'>
                            {error}
                        </Alert>
                    )}
                    <PasswordInput
                        label='New password'
                        placeholder='At least 8 characters'
                        autoComplete='new-password'
                        {...form.getInputProps('password')}
                    />
                    <PasswordInput
                        label='Confirm new password'
                        placeholder='Repeat your password'
                        autoComplete='new-password'
                        {...form.getInputProps('confirmPassword')}
                    />
                    <Button type='submit' fullWidth loading={loading}>
                        Reset password
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
}
