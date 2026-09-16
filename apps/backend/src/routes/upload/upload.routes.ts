import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { UploadSignatureRequestSchema, DeleteUploadRequestSchema } from '@staylark/contract';
import { uploadController } from './upload.controller.js';

const router = Router();

// Any signed-in user can request an upload signature; the controller enforces a
// per-folder role policy (avatars = self-service USER, properties = manager+).
router.post(
    '/signature',
    authMiddleware,
    validate(UploadSignatureRequestSchema, 'body'),
    uploadController.getSignature
);

// Admin-only can delete uploaded images
router.delete(
    '/',
    authMiddleware,
    adminMiddleware,
    validate(DeleteUploadRequestSchema, 'body'),
    uploadController.deleteImage
);

export { router as uploadRouter };
