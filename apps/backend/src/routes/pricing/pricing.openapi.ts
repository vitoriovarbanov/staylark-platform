import { z } from 'zod';
import {
    PricingModelMetadataSchema,
    PricingQuerySchema,
    PricingResponseSchema,
    PricingRuleCreateSchema,
    PricingRuleIdParamsSchema,
    PricingRuleListQuerySchema,
    PricingRuleSchema,
    PricingRuleUpdateSchema,
    PricingRulesListResponseSchema
} from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf } from '../../docs/components.js';

const TAG = 'Pricing';

const PricingRule = registry.register('PricingRule', PricingRuleSchema);
const PricingRuleCreate = registry.register('PricingRuleCreate', PricingRuleCreateSchema);
const PricingRuleUpdate = registry.register('PricingRuleUpdate', PricingRuleUpdateSchema);

registry.registerPath({
    method: 'get',
    path: '/api/pricing/model',
    tags: [TAG],
    summary: 'Get pricing model metadata (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    responses: {
        200: { description: 'Pricing model metadata', content: jsonOf(PricingModelMetadataSchema) },
        ...errors(401, 403)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/pricing/rules',
    tags: [TAG],
    summary: 'List pricing rules (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { query: PricingRuleListQuerySchema },
    responses: {
        200: { description: 'Pricing rules', content: jsonOf(PricingRulesListResponseSchema) },
        ...errors(400, 401, 403)
    }
});

registry.registerPath({
    method: 'post',
    path: '/api/pricing/rules',
    tags: [TAG],
    summary: 'Create a pricing rule (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { body: { content: jsonOf(PricingRuleCreate) } },
    responses: {
        201: { description: 'Created pricing rule', content: jsonOf(PricingRule) },
        ...errors(400, 401, 403)
    }
});

registry.registerPath({
    method: 'patch',
    path: '/api/pricing/rules/{id}',
    tags: [TAG],
    summary: 'Update a pricing rule (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: PricingRuleIdParamsSchema, body: { content: jsonOf(PricingRuleUpdate) } },
    responses: {
        200: { description: 'Updated pricing rule', content: jsonOf(PricingRule) },
        ...errors(400, 401, 403, 404)
    }
});

registry.registerPath({
    method: 'delete',
    path: '/api/pricing/rules/{id}',
    tags: [TAG],
    summary: 'Delete a pricing rule (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: PricingRuleIdParamsSchema },
    responses: {
        204: { description: 'Deleted (no content)' },
        ...errors(401, 403, 404)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/pricing/{propertyId}',
    tags: [TAG],
    summary: 'Get a price quote for a property',
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ propertyId: z.string().describe('Property ID') }), query: PricingQuerySchema },
    responses: {
        200: { description: 'Price quote', content: jsonOf(PricingResponseSchema) },
        ...errors(400, 401, 404)
    }
});
