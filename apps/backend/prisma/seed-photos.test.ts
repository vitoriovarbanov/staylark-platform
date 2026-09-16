import { describe, it, expect } from 'vitest';
import { DEMO_PHOTOS } from './seed-photos.js';

const allPhotos = Object.values(DEMO_PHOTOS).flat();

describe('demo photos', () => {
    it('provides photos for every seeded property', () => {
        expect(Object.keys(DEMO_PHOTOS)).toEqual(['sofiaApartment', 'banskoHotel', 'varnaHouse', 'plovdivApartment']);
        for (const photos of Object.values(DEMO_PHOTOS)) {
            expect(photos.length).toBeGreaterThan(0);
        }
    });

    // The handover hazard this guards: seed data that hardcodes one developer's
    // `cloud-name` keeps staging hotlinking an account nobody owns after the project
    // changes hands, and breaks silently the day that account is closed.
    it("is not hosted on anyone's Cloudinary account", () => {
        for (const url of allPhotos) {
            expect(new URL(url).host).not.toBe('res.cloudinary.com');
        }
    });

    it('uses absolute https URLs', () => {
        for (const url of allPhotos) {
            expect(new URL(url).protocol).toBe('https:');
        }
    });

    it('is deterministic, so re-seeding does not churn the catalogue', () => {
        expect(new Set(allPhotos).size).toBe(allPhotos.length);
    });
});
