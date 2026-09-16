import type { Express, RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { env } from '../config/env.js';
import { buildOpenApiDocument } from './openapi.js';

/**
 * Mounts Swagger UI at /api/docs and the raw spec at /api/docs.json.
 * No-op (nothing mounted → 404) in real production unless ENABLE_API_DOCS=true.
 * Staging runs NODE_ENV=production, so it sets ENABLE_API_DOCS=true explicitly.
 */
export function mountApiDocs(app: Express): void {
    const enabled = env.ENABLE_API_DOCS || env.NODE_ENV !== 'production';
    if (!enabled) return;

    const document = buildOpenApiDocument();

    // Helmet's GLOBAL CSP (app.ts) blocks Swagger UI's inline scripts/styles.
    // Relax CSP ONLY for the docs routes — do not touch the global helmet().
    const relaxedCsp: RequestHandler = helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                'script-src': ["'self'", "'unsafe-inline'"],
                'style-src': ["'self'", "'unsafe-inline'", 'https:'],
                'img-src': ["'self'", 'data:', 'https:']
            }
        }
    });

    app.get('/api/docs.json', relaxedCsp, (_req, res) => {
        res.json(document);
    });

    app.use(
        '/api/docs',
        relaxedCsp,
        swaggerUi.serve,
        swaggerUi.setup(document, {
            explorer: true,
            customSiteTitle: 'Staylark API Docs',
            swaggerOptions: { persistAuthorization: true }
        })
    );
}
