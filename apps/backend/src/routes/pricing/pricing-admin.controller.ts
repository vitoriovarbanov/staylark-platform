import type { Request, Response, NextFunction } from 'express';
import type { PricingRuleCreate, PricingRuleUpdate, PricingRuleListQuery } from '@staylark/contract';
import { pricingAdminService } from './service/pricing-admin.service.js';

export const pricingAdminController = {
    getModel: (_req: Request, res: Response, next: NextFunction) => {
        try {
            res.json(pricingAdminService.getModelMetadata());
        } catch (e) {
            next(e);
        }
    },

    listRules: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const q = req.query as unknown as PricingRuleListQuery;
            const result = await pricingAdminService.listRules(req.user!, {
                propertyId: q.propertyId,
                activeOn: q.activeOn,
                includeInactive: q.includeInactive,
                page: q.page,
                limit: q.limit
            });
            res.json(result);
        } catch (e) {
            next(e);
        }
    },

    createRule: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as PricingRuleCreate;
            const created = await pricingAdminService.createRule(req.user!, body);
            res.status(201).json(created);
        } catch (e) {
            next(e);
        }
    },

    updateRule: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as { id: string };
            const body = req.body as PricingRuleUpdate;
            const updated = await pricingAdminService.updateRule(req.user!, id, body);
            res.json(updated);
        } catch (e) {
            next(e);
        }
    },

    deleteRule: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as { id: string };
            const deleted = await pricingAdminService.deleteRule(req.user!, id);
            res.json(deleted);
        } catch (e) {
            next(e);
        }
    }
};
