import { z } from 'zod';
import {
    CreateFeedbackSchema,
    EligibleFeedbackResponseSchema,
    FeedbackAggregationQuerySchema,
    FeedbackAggregationSchema,
    FeedbackBookingParamsSchema,
    FeedbackPropertyParamsSchema,
    FeedbackSchema
} from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf } from '../../docs/components.js';

const TAG = 'Feedback';

const Feedback = registry.register('Feedback', FeedbackSchema);
const FeedbackAggregation = registry.register('FeedbackAggregation', FeedbackAggregationSchema);

// audio is optional: the client may submit text instead of voice
const FeedbackMultipart = CreateFeedbackSchema.extend({
    audio: z.any().optional().openapi({ type: 'string', format: 'binary' })
});

registry.registerPath({
    method: 'get',
    path: '/api/feedback/eligible',
    tags: [TAG],
    summary: 'List bookings eligible for feedback',
    security: [{ bearerAuth: [] }],
    responses: {
        200: { description: 'Eligible bookings', content: jsonOf(EligibleFeedbackResponseSchema) },
        ...errors(401)
    }
});

registry.registerPath({
    method: 'post',
    path: '/api/feedback',
    tags: [TAG],
    summary: 'Submit feedback (voice or text)',
    security: [{ bearerAuth: [] }],
    request: { body: { content: { 'multipart/form-data': { schema: FeedbackMultipart } } } },
    responses: {
        201: { description: 'Created feedback', content: jsonOf(Feedback) },
        ...errors(400, 401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/feedback/booking/{bookingId}',
    tags: [TAG],
    summary: 'Get feedback for a booking',
    security: [{ bearerAuth: [] }],
    request: { params: FeedbackBookingParamsSchema },
    responses: {
        200: { description: 'Feedback', content: jsonOf(Feedback) },
        ...errors(401, 404)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/feedback/property/{propertyId}',
    tags: [TAG],
    summary: 'Aggregated feedback for a property (ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { params: FeedbackPropertyParamsSchema, query: FeedbackAggregationQuerySchema },
    responses: {
        200: { description: 'Feedback aggregation', content: jsonOf(FeedbackAggregation) },
        ...errors(401, 403, 404)
    }
});
