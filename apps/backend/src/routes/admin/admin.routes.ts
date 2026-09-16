import { Router } from 'express';
import { TicketStatsQuerySchema } from '@staylark/contract';
import { authMiddleware, managerMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { adminController } from './admin.controller.js';

const router = Router();

// The dashboard is a MANAGER surface: every figure is scoped to the caller's own
// properties. Admins hold no operational access and are refused here.
router.use(authMiddleware);
router.use(managerMiddleware);

router.get('/stats', adminController.getStats);
router.get('/stats/properties', adminController.getPropertyStats);
router.get('/stats/tickets', validate(TicketStatsQuerySchema, 'query'), adminController.getTicketStats);

export { router as adminRouter };
