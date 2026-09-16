import {
    BookingConfirmQuerySchema,
    BookingParamsSchema,
    BookingQuerySchema,
    BookingSchema,
    CreateBookingSchema,
    PendingNearExpiryCountSchema
} from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf, paginated } from '../../docs/components.js';

const TAG = 'Bookings';

const Booking = registry.register('Booking', BookingSchema);
const CreateBooking = registry.register('CreateBooking', CreateBookingSchema);

registry.registerPath({
    method: 'post',
    path: '/api/bookings',
    tags: [TAG],
    summary: 'Create a booking',
    security: [{ bearerAuth: [] }],
    request: { body: { content: jsonOf(CreateBooking) } },
    responses: {
        201: { description: 'Created booking', content: jsonOf(Booking) },
        ...errors(400, 401, 409)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/bookings',
    tags: [TAG],
    summary: 'List the current user’s bookings (paginated)',
    security: [{ bearerAuth: [] }],
    request: { query: BookingQuerySchema },
    responses: {
        200: { description: 'Paginated bookings', content: jsonOf(paginated(Booking)) },
        ...errors(400, 401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/bookings/pending-near-expiry-count',
    tags: [TAG],
    summary: 'Count of the user’s pending bookings near expiry',
    security: [{ bearerAuth: [] }],
    responses: {
        200: { description: 'Pending-near-expiry count', content: jsonOf(PendingNearExpiryCountSchema) },
        ...errors(401)
    }
});

registry.registerPath({
    method: 'get',
    path: '/api/bookings/{id}',
    tags: [TAG],
    summary: 'Get a booking by ID',
    security: [{ bearerAuth: [] }],
    request: { params: BookingParamsSchema },
    responses: {
        200: { description: 'Booking', content: jsonOf(Booking) },
        ...errors(401, 404)
    }
});

registry.registerPath({
    method: 'patch',
    path: '/api/bookings/{id}/confirm',
    tags: [TAG],
    summary: 'Confirm a pending booking',
    security: [{ bearerAuth: [] }],
    request: { params: BookingParamsSchema, query: BookingConfirmQuerySchema },
    responses: {
        200: { description: 'Confirmed booking', content: jsonOf(Booking) },
        ...errors(400, 401, 404, 409)
    }
});

registry.registerPath({
    method: 'patch',
    path: '/api/bookings/{id}/cancel',
    tags: [TAG],
    summary: 'Cancel a booking',
    security: [{ bearerAuth: [] }],
    request: { params: BookingParamsSchema },
    responses: {
        200: { description: 'Cancelled booking', content: jsonOf(Booking) },
        ...errors(401, 404, 409)
    }
});
