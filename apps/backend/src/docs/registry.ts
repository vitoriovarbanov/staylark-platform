import { z } from 'zod';
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// MUST run before any schema is registered or any `.openapi()` metadata is read.
// Patches ZodType.prototype, so even schemas defined in @staylark/contract gain `.openapi()`.
extendZodWithOpenApi(z);

/** Shared registry — every `*.openapi.ts` file registers its paths/components here. */
export const registry = new OpenAPIRegistry();
