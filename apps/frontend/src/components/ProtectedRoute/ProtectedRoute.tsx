import { Navigate, useLocation, Outlet } from 'react-router';
import { LoadingOverlay } from '@mantine/core';
import { useAuth } from '@/contexts/auth-context';
import { buildSignInPath } from '@/lib/redirect';

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingOverlay visible />;
    }

    if (!isAuthenticated) {
        return <Navigate to={buildSignInPath(location)} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
}
