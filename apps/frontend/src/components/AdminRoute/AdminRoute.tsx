import { Navigate, useLocation } from 'react-router';
import { LoadingOverlay } from '@mantine/core';
import { useAuth } from '@/contexts/auth-context';
import { buildSignInPath } from '@/lib/redirect';
import { adminHomePath } from '@/lib/admin-home';

interface AdminRouteProps {
    children: React.ReactNode;
    requireRole?: 'ADMIN' | 'MANAGER';
}

/**
 * Gate for the staff portal. ADMIN and MANAGER have almost no shared surface —
 * admins administer people, managers run properties — so `requireRole` is the
 * norm rather than the exception, and a staff route without one is a bug.
 */
export function AdminRoute({ children, requireRole }: AdminRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingOverlay visible />;
    }

    if (!isAuthenticated) {
        return <Navigate to={buildSignInPath(location)} replace />;
    }

    const role = user?.role;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
        return <Navigate to='/' replace />;
    }

    // Wrong staff role → that role's own portal home, never a dead end.
    if (requireRole && role !== requireRole) {
        return <Navigate to={adminHomePath(role)} replace />;
    }

    return <>{children}</>;
}
