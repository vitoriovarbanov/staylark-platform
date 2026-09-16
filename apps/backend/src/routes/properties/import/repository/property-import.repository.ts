import { db } from '../../../../config/database.js';
import { serialize } from '../../repository/properties.repository.js';
import type { CreateProperty } from '@staylark/contract';

export const propertyImportRepository = {
    /**
     * Creates every property in one transaction. All-or-nothing survives a
     * mid-insert database failure, not just a validation failure.
     */
    createMany: async (properties: CreateProperty[], managerId: string) => {
        const created = await db.$transaction(
            properties.map(p =>
                db.property.create({
                    data: {
                        title: p.title,
                        description: p.description,
                        type: p.type,
                        city: p.city,
                        address: p.address,
                        nightlyPrice: p.nightlyPrice,
                        minNightlyPrice: p.minNightlyPrice ?? null,
                        maxNightlyPrice: p.maxNightlyPrice ?? null,
                        maxGuests: p.maxGuests,
                        amenities: p.amenities,
                        photos: p.photos,
                        managerId
                    }
                })
            )
        );
        return created.map(serialize);
    },

    setPhotos: async (id: string, photos: string[]) => {
        await db.property.update({ where: { id }, data: { photos } });
    },

    /**
     * Properties whose photos are not yet on our Cloudinary account — i.e. imports
     * whose migration never finished. Used by the boot sweep to resume after a
     * crash or deploy. No marker column needed: a non-Cloudinary URL *is* the marker.
     */
    findWithUnmigratedPhotos: async (cloudName: string) => {
        return db.$queryRaw<{ id: string; photos: string[] }[]>`
            SELECT id, photos FROM "Property"
            WHERE "deletedAt" IS NULL
              AND EXISTS (
                SELECT 1 FROM unnest(photos) AS p
                WHERE p NOT LIKE ${`https://res.cloudinary.com/${cloudName}/%`}
              )
            LIMIT 500
        `;
    }
};
