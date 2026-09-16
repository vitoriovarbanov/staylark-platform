import { createAuthClient } from 'better-auth/react';

const TOKEN_KEY = 'better-auth.session_token';

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL,
    // Better Auth's client refetches /get-session on every window refocus by
    // default (its own visibilitychange listener, independent of React Query).
    // During that refetch `isPending` flips true, and our route guards render a
    // full-screen LoadingOverlay — so a quick tab-switch blanks/reloads the page.
    // Disable it: the session is refetched on mount and after auth mutations.
    // (Runtime-only option, absent from the published client types.)
    sessionOptions: { refetchOnWindowFocus: false },
    fetchOptions: {
        auth: {
            type: 'Bearer',
            token: () => localStorage.getItem(TOKEN_KEY) ?? undefined
        },
        onSuccess: ctx => {
            // Better Auth returns token on sign-in/sign-up — persist it
            const token = (ctx.data as { token?: string })?.token;
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
            }
        }
    }
});

/** Remove stored token on sign-out */
export function clearAuthToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}
