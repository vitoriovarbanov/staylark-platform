import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware, managerMiddleware } from '../../middleware/auth.middleware.js';
import {
    PricingQuerySchema,
    PricingRuleCreateSchema,
    PricingRuleUpdateSchema,
    PricingRuleListQuerySchema,
    PricingRuleIdParamsSchema
} from '@staylark/contract';
import { pricingController } from './pricing.controller.js';
import { pricingAdminController } from './pricing-admin.controller.js';
import { env } from '../../config/env.js';

const router = Router();

router.use(
    rateLimit({
        windowMs: 60_000,
        limit: env.NODE_ENV === 'production' ? 60 : 200,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            error: 'Too Many Requests',
            message: 'Pricing rate limit exceeded. Try again in a minute.',
            statusCode: 429
        }
    })
);

// ── Admin routes (registered BEFORE the catch-all /:propertyId) ───
router.get('/model', authMiddleware, managerMiddleware, pricingAdminController.getModel);

router.get(
    '/rules',
    authMiddleware,
    managerMiddleware,
    validate(PricingRuleListQuerySchema, 'query'),
    pricingAdminController.listRules
);

router.post(
    '/rules',
    authMiddleware,
    managerMiddleware,
    validate(PricingRuleCreateSchema, 'body'),
    pricingAdminController.createRule
);

router.patch(
    '/rules/:id',
    authMiddleware,
    managerMiddleware,
    validate(PricingRuleIdParamsSchema, 'params'),
    validate(PricingRuleUpdateSchema, 'body'),
    pricingAdminController.updateRule
);

router.delete(
    '/rules/:id',
    authMiddleware,
    managerMiddleware,
    validate(PricingRuleIdParamsSchema, 'params'),
    pricingAdminController.deleteRule
);

// ── Quote route — MUST stay last so /:propertyId doesn't shadow literal paths ───
// authMiddleware goes on the route, NOT router.use(): a blanket use() here would
// double-apply auth to the manager routes above and make any literal path added
// after this line unreachable.
router.get('/:propertyId', authMiddleware, validate(PricingQuerySchema, 'query'), pricingController.getQuote);

export { router as pricingRouter };
