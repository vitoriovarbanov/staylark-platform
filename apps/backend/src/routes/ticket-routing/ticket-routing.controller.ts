import type { Request, Response, NextFunction } from 'express';
import type { TicketCategory } from '@staylark/contract';
import { ticketRoutingService } from './service/ticket-routing.service.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const ticketRoutingController = {
    list: asyncHandler(async (_req, res) => {
        const data = await ticketRoutingService.list();
        res.json({ data });
    }),

    updateCategory: asyncHandler(async (req, res) => {
        const category = req.params.category as TicketCategory;
        const { userIds } = req.body as { userIds: string[] };
        const actor = req.user!;
        const data = await ticketRoutingService.updateCategory(category, userIds, {
            id: actor.id,
            role: actor.role
        });
        res.json({ data });
    })
};
