import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
    CreateBookingSchema,
    BookingQuerySchema,
    BookingParamsSchema,
    BookingConfirmQuerySchema
} from '@staylark/contract';
import { bookingsController } from './bookings.controller.js';

const router = Router();

// All booking routes require authentication
router.use(authMiddleware);

// ── CRUD ─────────────────────────────────────────────────────
router.post('/', validate(CreateBookingSchema, 'body'), bookingsController.create);
router.get('/', validate(BookingQuerySchema, 'query'), bookingsController.list);

// ── Admin/manager widgets (static routes must come before /:id) ──
router.get('/pending-near-expiry-count', bookingsController.pendingNearExpiryCount);

router.get('/:id', validate(BookingParamsSchema, 'params'), bookingsController.getById);

// ── Status transitions ───────────────────────────────────────
router.patch(
    '/:id/confirm',
    validate(BookingParamsSchema, 'params'),
    validate(BookingConfirmQuerySchema, 'query'),
    bookingsController.confirm
);
router.patch('/:id/cancel', validate(BookingParamsSchema, 'params'), bookingsController.cancel);

export { router as bookingsRouter };
