import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { TextInput, PasswordInput, Button, Stack, Alert, Anchor } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { SignUpSchema, StrictSignUpSchema } from '@staylark/contract';
import { authClient } from '@/lib/auth-client';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';

// Use strict password validation in production, simple in dev
const BaseSchema = import.meta.env.PROD ? StrictSignUpSchema : SignUpSchema;

const SignUpFormSchema = BaseSchema.extend({
    confirmPassword: BaseSchema.shape.password
}).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

export function SignUpPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const form = useForm({
        validate: zodResolver(SignUpFormSchema),
        initialValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: ''
        }
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);

        const { error: authError } = await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password
        });

        setLoading(false);
        if (authError) {
            setError(authError.message ?? 'Sign up failed. Please try again.');
        } else {
            navigate('/sign-in', { state: { signUpSuccess: true }, replace: true });
        }
    };

    return (
        <AuthLayout
            title='Create an account'
            subtitle='Start your property journey'
            footer={
                <>
                    Already have an account?{' '}
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
                        label='Full name'
                        placeholder='John Doe'
                        autoComplete='name'
                        {...form.getInputProps('name')}
                    />
                    <TextInput
                        label='Email'
                        placeholder='you@example.com'
                        autoComplete='email'
                        {...form.getInputProps('email')}
                    />
                    <PasswordInput
                        label='Password'
                        placeholder='At least 8 characters'
                        autoComplete='new-password'
                        {...form.getInputProps('password')}
                    />
                    <PasswordInput
                        label='Confirm password'
                        placeholder='Repeat your password'
                        autoComplete='new-password'
                        {...form.getInputProps('confirmPassword')}
                    />
                    <Button type='submit' fullWidth loading={loading}>
                        Create account
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
}
