import type { Request, Response, NextFunction } from 'express';
import { bookingsService } from './service/bookings.service.js';
import type { BookingQuery, BookingConfirmQuery } from '@staylark/contract';

/** Wraps async route handler — forwards thrown errors to Express error middleware */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const bookingsController = {
    create: asyncHandler(async (req, res) => {
        const booking = await bookingsService.create(req.body, req.user!.id);
        res.status(201).json({ data: booking });
    }),

    list: asyncHandler(async (req, res) => {
        const result = await bookingsService.list(req.query as unknown as BookingQuery, req.user!.id, req.user!.role);
        res.json(result);
    }),

    getById: asyncHandler(async (req, res) => {
        const booking = await bookingsService.getById(req.params.id as string, req.user!.id, req.user!.role);
        res.json({ data: booking });
    }),

    confirm: asyncHandler(async (req, res) => {
        const { notify } = req.query as unknown as BookingConfirmQuery;
        const booking = await bookingsService.confirm(req.params.id as string, req.user!.id, req.user!.role, notify);
        res.json({ data: booking });
    }),

    cancel: asyncHandler(async (req, res) => {
        const booking = await bookingsService.cancel(req.params.id as string, req.user!.id, req.user!.role);
        res.json({ data: booking });
    }),

    pendingNearExpiryCount: asyncHandler(async (req, res) => {
        const count = await bookingsService.countPendingNearExpiry(req.user!.id, req.user!.role);
        res.json({ data: { count } });
    })
};
