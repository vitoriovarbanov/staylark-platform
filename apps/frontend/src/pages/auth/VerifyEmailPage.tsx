import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { Button, Stack, Alert, Loader, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { authClient } from '@/lib/auth-client';
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout';

/**
 * Reached two ways:
 *  1. Server-side flow (current): the email links to Better Auth's backend verify
 *     endpoint, which verifies the token and 302-redirects here with `?status=success`
 *     (or `?error=<code>` on failure). No client-side verification is needed — this
 *     works even when a webmail client opens the link inside a sandboxed iframe.
 *  2. Legacy flow (fallback): older emails link straight here with `?token=`, so we
 *     still verify client-side when a token is present.
 */
export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const hadError = searchParams.has('error');
    const wasVerified = searchParams.get('status') === 'success';

    // Server already decided the outcome → render it directly, no API call.
    const initialStatus = hadError ? 'error' : wasVerified ? 'success' : token ? 'loading' : 'invalid';
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>(initialStatus);
    const [error, setError] = useState<string | null>(
        hadError ? 'This verification link is invalid or has expired.' : null
    );
    const verifiedRef = useRef(false);

    useEffect(() => {
        // Only the legacy token flow needs a client-side call.
        if (status !== 'loading' || !token || verifiedRef.current) return;
        verifiedRef.current = true;

        authClient
            .verifyEmail({ query: { token } })
            .then(({ error: authError }) => {
                if (authError) {
                    setError(authError.message ?? 'Verification failed. The link may have expired.');
                    setStatus('error');
                } else {
                    setStatus('success');
                }
            })
            .catch(() => {
                setError('An unexpected error occurred.');
                setStatus('error');
            });
    }, [status, token]);

    if (status === 'invalid') {
        return (
            <AuthLayout title='Invalid link'>
                <Alert icon={<IconAlertCircle size={16} />} color='red' variant='light'>
                    This verification link is invalid.
                </Alert>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title='Email Verification'>
            <Stack align='center'>
                {status === 'loading' && (
                    <>
                        <Loader size='lg' />
                        <Text c='dimmed' size='sm'>
                            Verifying your email...
                        </Text>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <Alert icon={<IconCheck size={16} />} color='green' variant='light' w='100%'>
                            Email verified! You can now sign in to your account.
                        </Alert>
                        <Button variant='light' fullWidth component={Link} to='/sign-in'>
                            Sign in
                        </Button>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <Alert icon={<IconAlertCircle size={16} />} color='red' variant='light' w='100%'>
                            {error}
                        </Alert>
                        <Button variant='light' fullWidth onClick={() => navigate('/sign-in', { replace: true })}>
                            Back to Sign In
                        </Button>
                    </>
                )}
            </Stack>
        </AuthLayout>
    );
}
