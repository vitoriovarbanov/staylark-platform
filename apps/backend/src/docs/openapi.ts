import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry.js';
import './components.js';

// ── Feature registrations (added in later tasks; each self-registers on import) ──
import '../routes/properties/properties.openapi.js';
import '../routes/upload/upload.openapi.js';
import '../routes/bookings/bookings.openapi.js';
import '../routes/feedback/feedback.openapi.js';
import '../routes/tickets/tickets.openapi.js';
import '../routes/pricing/pricing.openapi.js';
import '../routes/users/users.openapi.js';

const AUTH_DESCRIPTION = [
    'Interactive API reference for the Staylark backend.',
    '',
    '## Authentication',
    'Most endpoints require a Bearer token. To obtain one:',
    '',
    '```bash',
    "curl -X POST '<BASE_URL>/api/auth/sign-in/email' \\",
    "  -H 'Content-Type: application/json' \\",
    '  -d \'{"email":"you@example.com","password":"yourpassword"}\'',
    '```',
    '',
    'Copy the `token` from the response, click **Authorize** above, and paste it.'
].join('\n');

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV31['generateDocument']> {
    const generator = new OpenApiGeneratorV31(registry.definitions);
    return generator.generateDocument({
        openapi: '3.1.0',
        info: {
            title: 'Staylark API',
            version: '1.0.0',
            description: AUTH_DESCRIPTION
        },
        servers: [{ url: '/', description: 'Current host' }]
    });
}
