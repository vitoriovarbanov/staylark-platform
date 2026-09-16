import { z } from 'zod';
import {
    CreateTicketSchema,
    TicketListResponseSchema,
    TicketParamsSchema,
    TicketQuerySchema,
    TicketSchema,
    UpdateTicketStatusSchema
} from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf } from '../../docs/components.js';

const TAG = 'Tickets';

const Ticket = registry.register('Ticket', TicketSchema);
const UpdateTicketStatus = registry.register('UpdateTicketStatus', UpdateTicketStatusSchema);

// audio is optional: the client may submit text instead of voice
const TicketMultipart = CreateTicketSchema.extend({
    audio: z.any().optional().openapi({ type: 'string', format: 'binary' })
});

registry.registerPath({
    method: 'get',
    path: '/api/tickets',
    tags: [TAG],
    summary: 'List tickets (filterable)',
    security: [{ bearerAuth: [] }],
    request: { query: TicketQuerySchema },
    responses: {
        200: { description: 'Tickets', content: jsonOf(TicketListResponseSchema) },
        ...errors(400, 401)
    }
});

registry.registerPath({
    method: 'post',
    path: '/api/tickets',
    tags: [TAG],
    summary: 'Report a problem (voice or text)',
    security: [{ bearerAuth: [] }],
    request: { body: { content: { 'multipart/form-data': { schema: TicketMultipart } } } },
    responses: {
        201: { description: 'Created ticket', content: jsonOf(Ticket) },
        ...errors(400, 401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/tickets/{id}',
    tags: [TAG],
    summary: 'Get a ticket by ID',
    security: [{ bearerAuth: [] }],
    request: { params: TicketParamsSchema },
    responses: {
        200: { description: 'Ticket', content: jsonOf(Ticket) },
        ...errors(401, 404)
    }
});

registry.registerPath({
    method: 'put',
    path: '/api/tickets/{id}/status',
    tags: [TAG],
    summary: 'Update ticket status (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: TicketParamsSchema, body: { content: jsonOf(UpdateTicketStatus) } },
    responses: {
        200: { description: 'Updated ticket', content: jsonOf(Ticket) },
        ...errors(400, 401, 403, 404)
    }
});
