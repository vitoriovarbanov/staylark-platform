import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/auth-context';
import { LoadingOverlay } from '@mantine/core';
import { safeRedirect } from '@/lib/redirect';

export function GuestRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const [searchParams] = useSearchParams();

    if (isLoading) {
        return <LoadingOverlay visible />;
    }

    if (!isLoading && isAuthenticated) {
        return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />;
    }

    return <>{children}</>;
}
