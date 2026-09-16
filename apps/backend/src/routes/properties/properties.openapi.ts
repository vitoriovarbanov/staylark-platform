import { z } from 'zod';
import {
    CreatePropertySchema,
    ImportResultSchema,
    ImportRowErrorSchema,
    PropertyFilterSchema,
    PropertySchema,
    UpdatePropertySchema
} from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf, paginated } from '../../docs/components.js';

const TAG = 'Properties';

// Named component refs (reused across operations)
const Property = registry.register('Property', PropertySchema);
const CreateProperty = registry.register('CreateProperty', CreatePropertySchema);
const UpdateProperty = registry.register('UpdateProperty', UpdatePropertySchema);

const IdParam = z.object({ id: z.string().describe('Property ID') });

registry.registerPath({
    method: 'get',
    path: '/api/properties/amenities',
    tags: [TAG],
    summary: 'List all distinct amenities',
    security: [{ bearerAuth: [] }],
    responses: {
        200: { description: 'Amenity names', content: jsonOf(z.array(z.string())) },
        ...errors(401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/properties/cities',
    tags: [TAG],
    summary: 'List all distinct cities',
    security: [{ bearerAuth: [] }],
    responses: {
        200: { description: 'City names', content: jsonOf(z.array(z.string())) },
        ...errors(401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/properties',
    tags: [TAG],
    summary: 'List properties (filterable, paginated)',
    security: [{ bearerAuth: [] }],
    request: { query: PropertyFilterSchema },
    responses: {
        200: { description: 'Paginated properties', content: jsonOf(paginated(Property)) },
        ...errors(400, 401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/properties/{id}',
    tags: [TAG],
    summary: 'Get a property by ID',
    security: [{ bearerAuth: [] }],
    request: { params: IdParam },
    responses: {
        200: { description: 'Property', content: jsonOf(Property) },
        ...errors(401, 404)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/properties/{id}/availability',
    tags: [TAG],
    summary: "Get a property's booked date ranges",
    security: [{ bearerAuth: [] }],
    request: { params: IdParam },
    responses: {
        200: {
            description: 'Booked date ranges',
            content: jsonOf(z.array(z.object({ checkIn: z.string(), checkOut: z.string() })))
        },
        ...errors(401, 404)
    }
});

registry.registerPath({
    method: 'post',
    path: '/api/properties',
    tags: [TAG],
    summary: 'Create a property (ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { body: { content: jsonOf(CreateProperty) } },
    responses: {
        201: { description: 'Created property', content: jsonOf(Property) },
        ...errors(400, 401, 403)
    }
});

registry.registerPath({
    method: 'patch',
    path: '/api/properties/{id}',
    tags: [TAG],
    summary: 'Update a property (ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: IdParam, body: { content: jsonOf(UpdateProperty) } },
    responses: {
        200: { description: 'Updated property', content: jsonOf(Property) },
        ...errors(400, 401, 403, 404)
    }
});

registry.registerPath({
    method: 'delete',
    path: '/api/properties/{id}',
    tags: [TAG],
    summary: 'Soft-delete a property (ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: IdParam },
    responses: {
        204: { description: 'Deleted (no content)' },
        ...errors(401, 403, 404)
    }
});

// ── Bulk import ──────────────────────────────────────────────

const ImportRowError = registry.register('ImportRowError', ImportRowErrorSchema);
const ImportResult = registry.register('ImportPropertiesResult', ImportResultSchema);

/** 422 is not in the shared `errors()` union — this is the only route that returns it. */
const importValidationFailed = {
    422: {
        description: 'The file was rejected. No properties were created.',
        content: jsonOf(
            z.object({
                error: z.string(),
                message: z.string(),
                statusCode: z.literal(422),
                errorCode: z.literal('IMPORT_VALIDATION_FAILED'),
                details: z.object({ rowCount: z.number(), errors: z.array(ImportRowError) })
            })
        )
    }
};

registry.registerPath({
    method: 'get',
    path: '/api/properties/import/template',
    tags: [TAG],
    summary: 'Download the bulk-import spreadsheet template (MANAGER only)',
    description:
        'Generated per request so the amenity suggestions reflect the live catalogue. ' +
        'Contains three sheets: Properties (fill this in), Reference and Example.',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'XLSX template',
            content: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                    schema: z.string().openapi({ type: 'string', format: 'binary' })
                }
            }
        },
        ...errors(401, 403)
    }
});

registry.registerPath({
    method: 'post',
    path: '/api/properties/import',
    tags: [TAG],
    summary: 'Bulk-create properties from a spreadsheet (MANAGER only)',
    description:
        'All-or-nothing: any invalid row rejects the whole file and nothing is written. ' +
        'Every created property is assigned to the uploading manager; a managerId column is not accepted. ' +
        'Photo URLs are validated for reachability during the request, then re-hosted on Cloudinary in the background.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'multipart/form-data': {
                    schema: z.object({
                        file: z.string().openapi({ type: 'string', format: 'binary' })
                    })
                }
            }
        }
    },
    responses: {
        201: { description: 'Properties created', content: jsonOf(ImportResult) },
        ...errors(400, 401, 403),
        ...importValidationFailed
    }
});
