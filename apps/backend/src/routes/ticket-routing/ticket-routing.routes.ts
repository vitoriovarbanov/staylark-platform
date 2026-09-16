import { Router } from 'express';
import { authMiddleware, staffMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { CategoryParamsSchema, UpdateCategoryAssigneesSchema } from '@staylark/contract';
import { ticketRoutingController } from './ticket-routing.controller.js';

const router = Router();
// Staff of either kind. Managers get read access so they can see WHY a ticket on
// their property went to someone else, and may toggle themselves as a handler.
// The service refuses any change a manager makes to another manager's entry.
router.use(authMiddleware);
router.use(staffMiddleware);

router.get('/', ticketRoutingController.list);
router.put(
    '/:category',
    validate(CategoryParamsSchema, 'params'),
    validate(UpdateCategoryAssigneesSchema, 'body'),
    ticketRoutingController.updateCategory
);

export { router as ticketRoutingRouter };
