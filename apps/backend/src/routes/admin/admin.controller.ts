import type { Request, Response, NextFunction } from 'express';
import { adminService } from './service/admin.service.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const adminController = {
    getStats: asyncHandler(async (req, res) => {
        const stats = await adminService.getStats(req.user!.id);
        res.json({ data: stats });
    }),

    getPropertyStats: asyncHandler(async (req, res) => {
        const stats = await adminService.getPropertyStats(req.user!.id);
        res.json({ data: stats });
    }),

    getTicketStats: asyncHandler(async (req, res) => {
        const { startDate, endDate, propertyId } = req.query as {
            startDate?: string;
            endDate?: string;
            propertyId?: string;
        };
        const stats = await adminService.getTicketStats(req.user!.id, startDate, endDate, propertyId);
        res.json({ data: stats });
    })
};
