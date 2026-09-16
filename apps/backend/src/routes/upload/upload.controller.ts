import type { Request, Response, NextFunction } from 'express';
import type { UploadSignatureRequest } from '@staylark/contract';
import { ForbiddenError } from '../../utils/errors.js';
import { uploadService } from './service/upload.service.js';
import { canUploadToFolder } from './upload.policy.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const uploadController = {
    getSignature: asyncHandler(async (req, res) => {
        const { folder } = req.body as UploadSignatureRequest;
        if (!canUploadToFolder(req.user?.role, folder)) {
            throw new ForbiddenError('You do not have permission to upload to this folder.');
        }
        const params = uploadService.getSignature(folder);
        res.json({ data: params });
    }),

    deleteImage: asyncHandler(async (req, res) => {
        const { publicId } = req.body;
        const result = await uploadService.deleteByPublicId(publicId);
        res.json({ data: result });
    })
};
