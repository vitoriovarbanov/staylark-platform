import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { redactUrl } from '@/lib/redact-url';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/auth-context';
import { theme, cssVariablesResolver } from './theme';
import App from './App';

// No DSN (local dev) → Sentry is a no-op; nothing is sent.
// Error capture only. Performance tracing / session replay need their own integrations
// (browserTracingIntegration / replayIntegration); add them here if those are wanted later.
if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        // Strip auth tokens (verify-email / reset-password / invite links) from URLs before
        // they're sent to Sentry — out of the event request URL and navigation breadcrumbs.
        beforeSend(event) {
            if (event.request?.url) event.request.url = redactUrl(event.request.url);
            return event;
        },
        beforeBreadcrumb(breadcrumb) {
            const data = breadcrumb.data;
            if (data) {
                if (typeof data.url === 'string') data.url = redactUrl(data.url);
                if (typeof data.to === 'string') data.to = redactUrl(data.to);
                if (typeof data.from === 'string') data.from = redactUrl(data.from);
            }
            return breadcrumb;
        }
    });
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Don't refetch every active query just because the tab regained focus —
            // a quick tab-switch shouldn't reload the page. Data still refetches on
            // mount and after mutations invalidate it. Hooks that genuinely need
            // focus-freshness (e.g. live ticket messages) opt back in individually.
            refetchOnWindowFocus: false,
            // Treat data as fresh for 1 min so remounts/navigations reuse the cache
            // instead of flashing a loading state on every visit.
            staleTime: 60_000
        }
    }
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
                <Notifications />
                <ModalsProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ModalsProvider>
            </MantineProvider>
        </QueryClientProvider>
    </StrictMode>
);
