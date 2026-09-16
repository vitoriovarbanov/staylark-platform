import type { Request, Response, NextFunction } from 'express';
import type { UpdateMyProfile } from '@staylark/contract';
import { meService } from './service/me.service.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const meController = {
    getProfile: asyncHandler(async (req, res) => {
        const data = await meService.getProfile(req.user!.id);
        res.json({ data });
    }),

    updateProfile: asyncHandler(async (req, res) => {
        const data = await meService.updateProfile(req.user!.id, req.body as UpdateMyProfile);
        res.json({ data });
    })
};
