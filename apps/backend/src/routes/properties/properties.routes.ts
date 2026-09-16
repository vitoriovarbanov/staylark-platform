import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authMiddleware, managerMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
    CreatePropertySchema,
    UpdatePropertySchema,
    PropertyFilterSchema,
    TransferPropertySchema
} from '@staylark/contract';
import { propertiesController } from './properties.controller.js';
import { propertyImportRouter } from './import/property-import.routes.js';

const router = Router();

/** Split comma-separated amenities query param into an array before Zod validation.
 *  Express 5 makes req.query read-only, so we override with Object.defineProperty. */
function normalizeAmenities(req: Request, _res: Response, next: NextFunction) {
    const raw = req.query.amenities;
    if (typeof raw === 'string') {
        const parsed = { ...req.query, amenities: raw.split(',').filter(Boolean) };
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
    }
    next();
}

// ── Bulk import (manager-only) ───────────────────────────────
// Mounted before `/:id` so `/import/template` is not swallowed by the id route.
router.use('/import', propertyImportRouter);

// ── Authenticated read routes ────────────────────────────────
// The app is gated: browsing the catalogue requires a session.
router.get('/amenities', authMiddleware, propertiesController.amenities);
router.get('/cities', authMiddleware, propertiesController.cities);
router.get('/availability-status', authMiddleware, propertiesController.availabilityStatus);
router.get('/range-availability', authMiddleware, propertiesController.rangeAvailability);
router.get('/', authMiddleware, normalizeAmenities, validate(PropertyFilterSchema, 'query'), propertiesController.list);
router.get('/:id', authMiddleware, propertiesController.getById);
router.get('/:id/availability', authMiddleware, propertiesController.availability);

// ── Manager routes ───────────────────────────────────────────
// Managers own their properties outright: they create them (auto-assigned to
// themselves), edit and delete only their own, and may hand one to another
// manager. Admins hold no property access at all.
router.post(
    '/',
    authMiddleware,
    managerMiddleware,
    validate(CreatePropertySchema, 'body'),
    propertiesController.create
);
router.patch(
    '/:id',
    authMiddleware,
    managerMiddleware,
    validate(UpdatePropertySchema, 'body'),
    propertiesController.update
);
router.delete('/:id', authMiddleware, managerMiddleware, propertiesController.remove);
router.patch(
    '/:id/manager',
    authMiddleware,
    managerMiddleware,
    validate(TransferPropertySchema, 'body'),
    propertiesController.transfer
);
router.post('/:id/claim', authMiddleware, managerMiddleware, propertiesController.claim);

export { router as propertiesRouter };
