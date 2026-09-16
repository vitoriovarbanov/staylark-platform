/**
 * Writes the generated OpenAPI document to apps/backend/openapi.json.
 * Run: pnpm --filter @staylark/backend gen:openapi
 * Uses the SAME buildOpenApiDocument() as the live UI, so the file never disagrees.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from '../src/docs/openapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../openapi.json');

const document = buildOpenApiDocument();
writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n');

console.log(`✅ Wrote ${outPath} (${Object.keys(document.paths ?? {}).length} paths).`);
