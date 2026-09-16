import { Router } from 'express';
import { UpdateMyProfileSchema } from '@staylark/contract';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { meController } from './me.controller.js';

const router = Router();

// Authenticated, but NOT admin-only — every route acts on the session user.
router.use(authMiddleware);

router.get('/profile', meController.getProfile);
router.patch('/profile', validate(UpdateMyProfileSchema, 'body'), meController.updateProfile);

export { router as meRouter };
