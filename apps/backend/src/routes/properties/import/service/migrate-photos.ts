import { cloudinary } from '../../../../config/cloudinary.js';
import { env } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';

type Deps = { upload: (url: string) => Promise<string>; cloudName: string };

const withPrefix = (logical: string) =>
    env.CLOUDINARY_FOLDER_PREFIX ? `${env.CLOUDINARY_FOLDER_PREFIX}/${logical}` : logical;

const defaultDeps = (): Deps => ({
    // Cloudinary fetches the remote URL itself — no download-to-buffer step here.
    upload: async url => {
        const result = await cloudinary.uploader.upload(url, { folder: withPrefix('properties') });
        return result.secure_url;
    },
    cloudName: env.CLOUDINARY_CLOUD_NAME
});

/**
 * True when a photo URL is already hosted on our own Cloudinary account.
 *
 * This is what makes a migration-state column unnecessary: every property created
 * through the normal form gets its photos via uploadToCloudinary, so any URL that
 * is *not* ours is by definition an un-migrated bulk-import URL.
 */
export function isCloudinaryUrl(url: string, cloudName: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    // Compare the host exactly — a prefix check would accept res.cloudinary.com.evil.test.
    return parsed.host === 'res.cloudinary.com' && parsed.pathname.startsWith(`/${cloudName}/`);
}

/** Re-hosts external URLs, preserving order. Failures keep the original URL. */
export async function migratePhotoUrls(photos: string[], deps?: Partial<Deps>): Promise<string[]> {
    const { upload, cloudName } = { ...defaultDeps(), ...deps };

    return Promise.all(
        photos.map(async original => {
            if (isCloudinaryUrl(original, cloudName)) return original;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    return await upload(original);
                } catch (err) {
                    if (attempt === 2) {
                        logger.warn({ err, url: original }, 'Cloudinary re-host failed; keeping external URL');
                    }
                }
            }
            return original;
        })
    );
}
