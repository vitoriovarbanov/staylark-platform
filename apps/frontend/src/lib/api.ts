import axios from 'axios';
import { buildSignInPath } from './redirect';

const TOKEN_KEY = 'better-auth.session_token';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
});

// Attach Bearer token for cross-origin staging (cookies blocked on public suffix domains)
api.interceptors.request.use(config => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Normalize error responses and handle 401 redirects
api.interceptors.response.use(
    response => response,
    error => {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = data?.message ?? error.message ?? 'An unexpected error occurred';
        const errorCode = data?.errorCode as string | undefined;
        const details: unknown = data?.details;

        // Redirect to sign-in on 401 — skip on auth pages to avoid redirect loops
        if (status === 401) {
            const authPaths = [
                '/sign-in',
                '/sign-up',
                '/forgot-password',
                '/reset-password',
                '/verify-email',
                '/accept-invite'
            ];

            const currentPath = window.location.pathname;

            if (!authPaths.some(path => currentPath.startsWith(path))) {
                window.location.href = buildSignInPath(window.location);
            }
        }

        return Promise.reject({ status, message, errorCode, details, original: error });
    }
);
