import type { Request, Response, NextFunction } from 'express';
import { propertyImportService } from './service/property-import.service.js';
import { TEMPLATE_FILENAME } from './service/build-template.js';
import { AppError } from '../../../utils/errors.js';

/** Wraps async route handler — forwards thrown errors to Express error middleware */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const propertyImportController = {
    template: asyncHandler(async (_req, res) => {
        const buffer = await propertyImportService.buildTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${TEMPLATE_FILENAME}"`);
        res.send(buffer);
    }),

    import: asyncHandler(async (req, res) => {
        if (!req.file) throw new AppError('No file uploaded', 400);
        const result = await propertyImportService.import(req.file.buffer, req.file.originalname, req.user!.id);
        res.status(201).json({ data: result });
    })
};
