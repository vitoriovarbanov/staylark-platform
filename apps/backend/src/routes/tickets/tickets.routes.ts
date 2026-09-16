import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, managerMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
    CreateTicketSchema,
    UpdateTicketStatusSchema,
    TicketParamsSchema,
    TicketQuerySchema,
    ReassignTicketSchema,
    CreateTicketMessageSchema,
    SuggestReplySchema
} from '@staylark/contract';
import { ticketsController } from './tickets.controller.js';
import { AppError } from '../../utils/errors.js';

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
router.use(authMiddleware);

// List + create + read (any authenticated user; service enforces scoping)
router.get('/', validate(TicketQuerySchema, 'query'), ticketsController.list);
router.post('/', upload.single('audio'), validate(CreateTicketSchema, 'body'), ticketsController.create);

// Unread reply count for the current reporter — drives the "My Reports" header badge.
// Static path: must be registered before the `/:id` param route.
router.get('/unread-count', ticketsController.unreadCount);

router.get('/:id', validate(TicketParamsSchema, 'params'), ticketsController.getById);

// Thread — visibility matches the ticket itself (service reuses getById's canView)
router.get('/:id/messages', validate(TicketParamsSchema, 'params'), ticketsController.listMessages);
router.post(
    '/:id/messages',
    validate(TicketParamsSchema, 'params'),
    validate(CreateTicketMessageSchema, 'body'),
    ticketsController.addMessage
);

// Reporter-only read stamp for unread badges
router.post('/:id/seen', validate(TicketParamsSchema, 'params'), ticketsController.markSeen);

// AI reply suggestion — MANAGER/ADMIN only; service re-checks per-ticket visibility.
router.post(
    '/:id/suggest-reply',
    managerMiddleware,
    validate(TicketParamsSchema, 'params'),
    validate(SuggestReplySchema, 'body'),
    ticketsController.suggestReply
);

// Status update — MANAGER/ADMIN only (service double-checks manager scoping)
router.put(
    '/:id/status',
    managerMiddleware,
    validate(TicketParamsSchema, 'params'),
    validate(UpdateTicketStatusSchema, 'body'),
    ticketsController.updateStatus
);

// Withdraw — any authenticated user, but the service enforces owner + OPEN-only.
// A reporter cancelling their own mistaken report; sets status to DISMISSED.
router.post('/:id/withdraw', validate(TicketParamsSchema, 'params'), ticketsController.withdraw);

// Reassign — the property's manager or the current assignee (enforced in the service).
router.put(
    '/:id/assignee',
    managerMiddleware,
    validate(TicketParamsSchema, 'params'),
    validate(ReassignTicketSchema, 'body'),
    ticketsController.reassign
);

export { router as ticketsRouter };
