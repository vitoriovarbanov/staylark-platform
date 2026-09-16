import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, managerMiddleware } from '../../../middleware/auth.middleware.js';
import { IMPORT_MAX_FILE_BYTES } from '@staylark/contract';
import { AppError } from '../../../utils/errors.js';
import { propertyImportController } from './property-import.controller.js';

// Browsers are inconsistent about the MIME type they attach to a .csv, so the
// extension is the primary check and the MIME list is a backstop.
const ALLOWED_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'text/plain',
    'application/octet-stream'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMPORT_MAX_FILE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        const named = /\.(xlsx|csv)$/i.test(file.originalname);
        if (named && ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
        else cb(new AppError('File must be .xlsx or .csv', 400));
    }
});

const router = Router();

// ── Manager routes ───────────────────────────────────────────
// MANAGER only. Admins hold no property access at all — see
// docs/plans/2026-07-28-admin-role-narrowing-design.md. Every imported property is
// assigned to the uploader, which is why the template has no managerId column.
router.get('/template', authMiddleware, managerMiddleware, propertyImportController.template);
router.post('/', authMiddleware, managerMiddleware, upload.single('file'), propertyImportController.import);

export { router as propertyImportRouter };
