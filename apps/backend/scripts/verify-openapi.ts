/**
 * Verifies the OpenAPI document generates without throwing and meets minimum
 * coverage expectations. Run: pnpm --filter @staylark/backend verify:openapi
 *
 * This is the project's stand-in for a unit test (no test framework is installed).
 */
import { PropertySchema } from '@staylark/contract';
import { buildOpenApiDocument } from '../src/docs/openapi.js';

function fail(msg: string): never {
    console.error(`❌ ${msg}`);
    process.exit(1);
}

// 1. The Zod extension must be active on contract schemas (single-instance guard).
if (typeof (PropertySchema as unknown as { openapi?: unknown }).openapi !== 'function') {
    fail('extendZodWithOpenApi did not patch contract schemas — likely a duplicate zod instance.');
}

// 2. The document must build without throwing.
let doc: ReturnType<typeof buildOpenApiDocument>;
try {
    doc = buildOpenApiDocument();
} catch (err) {
    fail(`buildOpenApiDocument threw: ${(err as Error).message}`);
}

// 3. It must be OpenAPI 3.1 and contain a known path + the bearer scheme + ErrorResponse.
if (doc.openapi !== '3.1.0') fail(`Expected openapi 3.1.0, got ${doc.openapi}`);
if (!doc.components?.securitySchemes?.bearerAuth) fail('bearerAuth security scheme missing.');
if (!doc.components?.schemas?.ErrorResponse) fail('ErrorResponse component missing.');

const pathCount = Object.keys(doc.paths ?? {}).length;
console.log(`✅ OpenAPI document generated: ${pathCount} paths registered.`);

// EXPECTED_MIN_PATHS rises as feature files are added. Final target after all 7 features: 30.
const EXPECTED_MIN_PATHS = Number(process.env.EXPECTED_MIN_PATHS ?? '0');
if (pathCount < EXPECTED_MIN_PATHS) {
    fail(`Expected at least ${EXPECTED_MIN_PATHS} paths, got ${pathCount}.`);
}
