import type { Request, Response, NextFunction } from 'express';
import { pricingService } from './service/pricing.service.js';
import type { PricingQuery } from '@staylark/contract';

export const pricingController = {
    getQuote: async (
        req: Request<{ propertyId: string }, unknown, unknown, PricingQuery>,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { propertyId } = req.params;
            const { checkIn, checkOut } = req.query;
            const response = await pricingService.quote(propertyId, checkIn, checkOut);
            res.json(response);
        } catch (err) {
            next(err);
        }
    }
};
