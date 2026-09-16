import type { Request, Response, NextFunction } from 'express';
import { propertiesService } from './service/properties.service.js';
import type { PropertyFilter, TransferProperty } from '@staylark/contract';

/** Wraps async route handler — forwards thrown errors to Express error middleware */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const propertiesController = {
    list: asyncHandler(async (req, res) => {
        const viewer = req.user ? { id: req.user.id, role: req.user.role } : undefined;
        const result = await propertiesService.list(req.query as unknown as PropertyFilter, viewer);
        res.json(result);
    }),

    getById: asyncHandler(async (req, res) => {
        const property = await propertiesService.getById(req.params.id as string);
        res.json({ data: property });
    }),

    amenities: asyncHandler(async (_req, res) => {
        const amenities = await propertiesService.getAmenities();
        res.json({ data: amenities });
    }),

    cities: asyncHandler(async (_req, res) => {
        const cities = await propertiesService.getCities();
        res.json({ data: cities });
    }),

    availability: asyncHandler(async (req, res) => {
        const data = await propertiesService.getAvailability(req.params.id as string);
        res.json({ data });
    }),

    availabilityStatus: asyncHandler(async (req, res) => {
        const raw = req.query.ids;
        // Accept a comma-separated `ids` param; cap the batch so the board can't request unbounded rows.
        const ids = typeof raw === 'string' ? [...new Set(raw.split(',').filter(Boolean))].slice(0, 50) : [];
        const data = await propertiesService.getAvailabilityStatuses(ids);
        res.json({ data });
    }),

    rangeAvailability: asyncHandler(async (req, res) => {
        const raw = req.query.ids;
        const checkIn = typeof req.query.checkIn === 'string' ? req.query.checkIn : '';
        const checkOut = typeof req.query.checkOut === 'string' ? req.query.checkOut : '';
        const ids = typeof raw === 'string' ? [...new Set(raw.split(',').filter(Boolean))].slice(0, 50) : [];

        // Dates are required and must be plain YYYY-MM-DD (fed straight into a ::date cast);
        // anything else short-circuits to an empty result rather than erroring.
        const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
        if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) {
            res.json({ data: [] });
            return;
        }

        const data = await propertiesService.getRangeAvailability(ids, checkIn, checkOut);
        res.json({ data });
    }),

    create: asyncHandler(async (req, res) => {
        const property = await propertiesService.create(req.body, req.user!.id);
        res.status(201).json({ data: property });
    }),

    update: asyncHandler(async (req, res) => {
        const property = await propertiesService.update(req.params.id as string, req.body, req.user!.id);
        res.json({ data: property });
    }),

    remove: asyncHandler(async (req, res) => {
        await propertiesService.remove(req.params.id as string, req.user!.id);
        res.status(204).send();
    }),

    transfer: asyncHandler(async (req, res) => {
        const { managerId } = req.body as TransferProperty;
        const property = await propertiesService.transfer(req.params.id as string, managerId, req.user!.id);
        res.json({ data: property });
    }),

    claim: asyncHandler(async (req, res) => {
        const property = await propertiesService.claim(req.params.id as string, req.user!.id);
        res.json({ data: property });
    })
};
