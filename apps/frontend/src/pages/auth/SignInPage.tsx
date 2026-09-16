import { useState } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router';
import { TextInput, PasswordInput, Button, Stack, Alert, Anchor, Group } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { SignInSchema } from '@staylark/contract';
import { authClient } from '@/lib/auth-client';
import { adminHomePath } from '@/lib/admin-home';
import { safeRedirect } from '@/lib/redirect';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';

export function SignInPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const signUpSuccess = (location.state as { signUpSuccess?: boolean })?.signUpSuccess;

    const rawRedirect = searchParams.get('redirect');
    const hasExplicitRedirect = rawRedirect !== null && safeRedirect(rawRedirect, '') !== '';

    const form = useForm({
        validate: zodResolver(SignInSchema),
        initialValues: { email: '', password: '' }
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);
        const { error: authError } = await authClient.signIn.email(values);
        if (authError) {
            setLoading(false);
            setError(authError.message ?? 'Sign in failed. Please try again.');
        } else if (hasExplicitRedirect) {
            navigate(safeRedirect(rawRedirect));
        } else {
            // Role-based default: USER→home, ADMIN→dashboard, MANAGER→properties.
            const { data: session } = await authClient.getSession();
            const role = (session?.user as { role?: string } | undefined)?.role;
            const isStaff = role === 'ADMIN' || role === 'MANAGER';
            navigate(isStaff ? adminHomePath(role) : '/');
        }
    };

    return (
        <AuthLayout
            title='Welcome back'
            subtitle='Sign in to your account'
            footer={
                <>
                    Don&apos;t have an account?{' '}
                    <Anchor component={Link} to='/sign-up' size='sm'>
                        Sign up
                    </Anchor>
                </>
            }
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    {signUpSuccess && (
                        <Alert icon={<IconCheck size={16} />} color='green' variant='light'>
                            Account created! Check your email for a verification link.
                        </Alert>
                    )}
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
                    <PasswordInput
                        label='Password'
                        placeholder='Your password'
                        autoComplete='current-password'
                        {...form.getInputProps('password')}
                    />
                    <Group justify='flex-end'>
                        <Anchor component={Link} to='/forgot-password' size='sm'>
                            Forgot password?
                        </Anchor>
                    </Group>
                    <Button type='submit' fullWidth loading={loading}>
                        Sign in
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
}
