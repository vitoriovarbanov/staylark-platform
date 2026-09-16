import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '@staylark/contract';
import { authClient, clearAuthToken } from '@/lib/auth-client';

interface AuthUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

interface AuthContextValue {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: session, isPending } = authClient.useSession();

    const signOut = useCallback(async () => {
        await authClient.signOut();
        clearAuthToken();
        // Straight to sign-in: '/' is gated and would only bounce here anyway.
        window.location.href = '/sign-in';
    }, []);

    const value: AuthContextValue = {
        user: (session?.user as AuthUser) ?? null,
        isLoading: isPending,
        isAuthenticated: !!session?.user,
        signOut
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
