import { z } from 'zod';
import { ManagerSummarySchema } from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf } from '../../docs/components.js';

const TAG = 'Users';

const ManagerSummary = registry.register('ManagerSummary', ManagerSummarySchema);

const IdParam = z.object({ id: z.string().describe('User ID') });

registry.registerPath({
    method: 'get',
    path: '/api/users/managers',
    tags: [TAG],
    summary: 'List managers (ADMIN only)',
    security: [{ bearerAuth: [] }],
    responses: {
        200: { description: 'Managers', content: jsonOf(z.object({ data: z.array(ManagerSummary) })) },
        ...errors(401, 403)
    }
});

registry.registerPath({
    method: 'delete',
    path: '/api/users/{id}',
    tags: [TAG],
    summary: 'Soft-delete a user (ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: IdParam },
    responses: {
        204: { description: 'Deleted (no content)' },
        ...errors(401, 403, 404)
    }
});
