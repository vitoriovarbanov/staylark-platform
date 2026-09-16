import { describe, expect, test, vi } from 'vitest';
import { migratePhotoUrls, isCloudinaryUrl } from './migrate-photos.js';

const CLOUD = 'demo-cloud';
const hosted = (n: string) => `https://res.cloudinary.com/${CLOUD}/image/upload/v1/${n}.jpg`;

describe('isCloudinaryUrl', () => {
    test('recognises our own hosted urls', () => {
        expect(isCloudinaryUrl(hosted('a'), CLOUD)).toBe(true);
    });

    test('rejects another cloudinary account', () => {
        expect(isCloudinaryUrl('https://res.cloudinary.com/other/image/upload/v1/a.jpg', CLOUD)).toBe(false);
    });

    test('rejects external hosts', () => {
        expect(isCloudinaryUrl('https://example.com/a.jpg', CLOUD)).toBe(false);
    });

    test('is not fooled by a lookalike host', () => {
        expect(isCloudinaryUrl(`https://res.cloudinary.com.evil.test/${CLOUD}/a.jpg`, CLOUD)).toBe(false);
    });
});

describe('migratePhotoUrls', () => {
    test('replaces external urls and preserves order', async () => {
        const upload = vi.fn(async (url: string) => hosted(url.slice(-5, -4)));
        const result = await migratePhotoUrls(['https://example.com/a.jpg', 'https://example.com/b.jpg'], {
            upload,
            cloudName: CLOUD
        });
        expect(result).toEqual([hosted('a'), hosted('b')]);
    });

    test('leaves already-hosted urls untouched and does not re-upload them', async () => {
        const upload = vi.fn(async () => hosted('x'));
        const result = await migratePhotoUrls([hosted('a')], { upload, cloudName: CLOUD });
        expect(result).toEqual([hosted('a')]);
        expect(upload).not.toHaveBeenCalled();
    });

    test('keeps the original url when upload keeps failing', async () => {
        const upload = vi.fn(async () => {
            throw new Error('boom');
        });
        const result = await migratePhotoUrls(['https://example.com/a.jpg'], { upload, cloudName: CLOUD });
        expect(result).toEqual(['https://example.com/a.jpg']);
    });

    test('retries once before giving up', async () => {
        const upload = vi
            .fn<(url: string) => Promise<string>>()
            .mockRejectedValueOnce(new Error('transient'))
            .mockResolvedValueOnce(hosted('a'));
        const result = await migratePhotoUrls(['https://example.com/a.jpg'], { upload, cloudName: CLOUD });
        expect(upload).toHaveBeenCalledTimes(2);
        expect(result).toEqual([hosted('a')]);
    });

    test('one failure does not stop the others', async () => {
        const upload = vi.fn(async (url: string) => {
            if (url.includes('bad')) throw new Error('boom');
            return hosted('ok');
        });
        const result = await migratePhotoUrls(['https://example.com/bad.jpg', 'https://example.com/good.jpg'], {
            upload,
            cloudName: CLOUD
        });
        expect(result).toEqual(['https://example.com/bad.jpg', hosted('ok')]);
    });

    test('handles an empty photo list', async () => {
        const upload = vi.fn(async () => hosted('x'));
        expect(await migratePhotoUrls([], { upload, cloudName: CLOUD })).toEqual([]);
        expect(upload).not.toHaveBeenCalled();
    });
});
