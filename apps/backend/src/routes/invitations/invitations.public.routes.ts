import { Router } from 'express';
import { AcceptInvitationSchema } from '@staylark/contract';
import { validate } from '../../middleware/validate.middleware.js';
import { invitationsController } from '../users/invitations/invitations.controller.js';

const router = Router();
router.get('/:token', invitationsController.lookup);
router.post('/:token/accept', validate(AcceptInvitationSchema, 'body'), invitationsController.accept);
export { router as invitationsPublicRouter };
