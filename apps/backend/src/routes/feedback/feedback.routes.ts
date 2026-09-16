import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, adminMiddleware, managerMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
    CreateFeedbackSchema,
    FeedbackBookingParamsSchema,
    FeedbackPropertyParamsSchema,
    FeedbackAggregationQuerySchema
} from '@staylark/contract';
import { feedbackController } from './feedback.controller.js';
import { AppError } from '../../utils/errors.js';

// Multer: memory storage, 10MB limit, audio MIME types only
const ALLOWED_MIMES = [
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp4',
    'audio/ogg'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError(`Unsupported audio format: ${file.mimetype}. Allowed: ${ALLOWED_MIMES.join(', ')}`, 400));
        }
    }
});

const router = Router();

// All feedback routes require authentication
router.use(authMiddleware);

// ── User routes ───────────────────────────────────────────────
router.get('/eligible', feedbackController.getEligible);

router.post('/', upload.single('audio'), validate(CreateFeedbackSchema, 'body'), feedbackController.submit);

router.get('/booking/:bookingId', validate(FeedbackBookingParamsSchema, 'params'), feedbackController.getByBookingId);

// ── Staff routes ──────────────────────────────────────────────
// Managers may view aggregation for properties they manage; the service scopes access.
router.get(
    '/property/:propertyId',
    validate(FeedbackPropertyParamsSchema, 'params'),
    validate(FeedbackAggregationQuerySchema, 'query'),
    managerMiddleware,
    feedbackController.getPropertyAggregation
);

// Internal/admin: re-run inference analysis over existing rows — re-tag aspects and retry
// any failed classification. One-off (re-tag history) or an optional scheduled safety net.
router.post('/backfill', adminMiddleware, feedbackController.backfill);

export { router as feedbackRouter };
