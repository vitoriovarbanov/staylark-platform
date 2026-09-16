import { z } from 'zod';

export const UploadSignatureRequestSchema = z.object({
    // `avatars` is self-service for any signed-in user; `properties` is manager+.
    // Per-folder authorization is enforced server-side (see upload.policy.ts).
    folder: z.enum(['properties', 'avatars'])
});

export const DeleteUploadRequestSchema = z.object({
    publicId: z.string().min(1)
});

export type UploadSignatureRequest = z.infer<typeof UploadSignatureRequestSchema>;
export type DeleteUploadRequest = z.infer<typeof DeleteUploadRequestSchema>;
