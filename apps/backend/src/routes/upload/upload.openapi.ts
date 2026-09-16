import { z } from 'zod';
import { DeleteUploadRequestSchema, UploadSignatureRequestSchema } from '@staylark/contract';
import { registry } from '../../docs/registry.js';
import { errors, jsonOf } from '../../docs/components.js';

const TAG = 'Upload';

// Response shapes mirror upload.controller.ts (both wrapped in `data`).
const SignatureResponse = z.object({
    data: z.object({
        signature: z.string(),
        timestamp: z.number(),
        apiKey: z.string(),
        cloudName: z.string(),
        folder: z.string()
    })
});

const DeleteResponse = z.object({
    data: z.object({ result: z.string() })
});

registry.registerPath({
    method: 'post',
    path: '/api/upload/signature',
    tags: [TAG],
    summary: 'Get a Cloudinary upload signature (MANAGER/ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { body: { content: jsonOf(UploadSignatureRequestSchema) } },
    responses: {
        200: { description: 'Cloudinary signature parameters', content: jsonOf(SignatureResponse) },
        ...errors(400, 401, 403)
    }
});

registry.registerPath({
    method: 'delete',
    path: '/api/upload',
    tags: [TAG],
    summary: 'Delete an uploaded image by public ID (ADMIN only)',
    security: [{ bearerAuth: [] }],
    request: { body: { content: jsonOf(DeleteUploadRequestSchema) } },
    responses: {
        200: { description: 'Deletion result', content: jsonOf(DeleteResponse) },
        ...errors(400, 401, 403)
    }
});
