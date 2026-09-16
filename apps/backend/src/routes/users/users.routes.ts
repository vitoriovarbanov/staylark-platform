import { Router } from 'express';
import {
    AdminUpdateUserSchema,
    AdminDeleteUserSchema,
    UserListQuerySchema,
    CreateInvitationSchema
} from '@staylark/contract';
import { authMiddleware, adminMiddleware, staffMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { usersController } from './users.controller.js';
import { invitationsController } from './invitations/invitations.controller.js';

const router = Router();

// Mounted BEFORE the router-wide admin guard below: managers need the roster to
// pick a ticket assignee or a transfer target. Express matches in registration
// order, so moving this below `router.use(adminMiddleware)` would 403 managers.
//
// Staff-of-either-kind, not manager-only: admins need the same roster for the
// ticket-routing config and the successor picker when removing a manager.
// Returns id/name/email/role only — no PII beyond what a picker needs.
router.get('/managers', authMiddleware, staffMiddleware, usersController.listManagers);

// Every route below here is ADMIN-only.
router.use(authMiddleware, adminMiddleware);

// Invitations (static `/invitations` paths — must precede `/:id` routes).
router.get('/invitations', invitationsController.list);
router.post('/invitations', validate(CreateInvitationSchema, 'body'), invitationsController.create);
router.post('/invitations/:id/resend', invitationsController.resend);
router.post('/invitations/:id/revoke', invitationsController.revoke);

router.get('/', validate(UserListQuerySchema, 'query'), usersController.list);

router.patch('/:id', validate(AdminUpdateUserSchema, 'body'), usersController.update);
router.post('/:id/restore', usersController.restore);
router.delete('/:id', validate(AdminDeleteUserSchema, 'body'), usersController.remove);

export { router as usersRouter };
