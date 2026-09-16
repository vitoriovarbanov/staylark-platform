import { UploadSignatureRequestSchema } from '@staylark/contract';
import { cloudinary } from '../../../config/cloudinary.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../utils/errors.js';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = 'jpg,png,webp';
const ALLOWED_LOGICAL_FOLDERS = UploadSignatureRequestSchema.shape.folder.options;

const withPrefix = (logical: string) =>
    env.CLOUDINARY_FOLDER_PREFIX ? `${env.CLOUDINARY_FOLDER_PREFIX}/${logical}` : logical;

export const uploadService = {
    getSignature: (folder: string) => {
        const timestamp = Math.round(Date.now() / 1000);
        const physicalFolder = withPrefix(folder);

        const paramsToSign: Record<string, string | number> = {
            timestamp,
            folder: physicalFolder,
            allowed_formats: ALLOWED_FORMATS
        };

        const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

        return {
            signature,
            timestamp,
            apiKey: env.CLOUDINARY_API_KEY,
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            folder: physicalFolder,
            allowedFormats: ALLOWED_FORMATS
        };
    },

    /**
     * Server-side upload of an audio buffer (e.g. voice feedback) to Cloudinary.
     * Audio is stored under the video resource type — Cloudinary's documented path for
     * webm/mp3/wav/mp4/ogg. Lands in the per-env prefixed `feedback-audio` folder so
     * dev/staging/prod stay isolated, exactly like images. Returns the secure URL.
     */
    uploadAudio: (buffer: Buffer): Promise<string> => {
        const folder = withPrefix('feedback-audio');

        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'video' }, (error, result) => {
                if (error || !result) {
                    reject(error ?? new AppError('Cloudinary audio upload returned no result', 500, false));
                    return;
                }
                resolve(result.secure_url);
            });
            stream.end(buffer);
        });
    },

    deleteByPublicId: async (publicId: string) => {
        // Only allow deletion of publicIds rooted in this env's prefixed folders,
        // so dev/staging can never destroy production assets even with a stolen id.
        const allowedPrefixes = ALLOWED_LOGICAL_FOLDERS.map(f => `${withPrefix(f)}/`);
        const isAllowed = allowedPrefixes.some(p => publicId.startsWith(p));
        if (!isAllowed) {
            throw new AppError(`Deletion not allowed for path: ${publicId}`, 400);
        }

        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result !== 'ok' && result.result !== 'not found') {
            throw new AppError(`Failed to delete image: ${result.result}`, 500, false);
        }
        return { result: result.result };
    }
};
