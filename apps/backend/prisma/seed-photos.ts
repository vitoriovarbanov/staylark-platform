/**
 * Demo photos for the seeded properties.
 *
 * Deliberately hosted on no particular Cloudinary account. Seed data that hardcodes one
 * developer's `cloud-name` outlives the handover: staging keeps hotlinking an account
 * nobody owns any more, and the catalogue breaks the day that account is closed.
 *
 * No manual upload step is needed to make these local. `sweepUnmigratedPhotos` runs on
 * boot, treats any non-Cloudinary URL as an unfinished import, and has Cloudinary fetch
 * each one into whatever account `CLOUDINARY_CLOUD_NAME` points at — under that
 * environment's own folder prefix. Seeding therefore self-heals into the owning account.
 *
 * See `import/service/migrate-photos.ts`.
 */

/** Stable per (slug, index), so re-seeding yields the same catalogue. */
const demoPhoto = (slug: string, index: number) => `https://picsum.photos/seed/staylark-${slug}-${index}/1200/800`;

const photoSet = (slug: string, count: number) => Array.from({ length: count }, (_, i) => demoPhoto(slug, i + 1));

export const DEMO_PHOTOS = {
    sofiaApartment: photoSet('sofia-apartment', 2),
    banskoHotel: photoSet('bansko-hotel', 2),
    varnaHouse: photoSet('varna-house', 3),
    plovdivApartment: photoSet('plovdiv-apartment', 3)
} satisfies Record<string, string[]>;
