import { propertiesService } from '../../service/properties.service.js';
import { propertyImportRepository } from '../repository/property-import.repository.js';
import { ImportValidationError } from '../../../../utils/errors.js';
import { logger } from '../../../../utils/logger.js';
import { env } from '../../../../config/env.js';
import { parseSheet } from './parse-sheet.js';
import { validateRows } from './validate-rows.js';
import { checkPhotoUrls } from './check-photo-urls.js';
import { normaliseAmenities } from './normalise-amenities.js';
import { buildTemplate } from './build-template.js';
import { migratePhotoUrls } from './migrate-photos.js';
import type { ImportRowError } from '@staylark/contract';

const MIGRATION_CONCURRENCY = 4;

/** Re-hosts photos a few properties at a time, so a 100-row import cannot swamp the process. */
async function migrateInBackground(targets: { id: string; photos: string[] }[]): Promise<void> {
    try {
        for (let i = 0; i < targets.length; i += MIGRATION_CONCURRENCY) {
            await Promise.all(
                targets.slice(i, i + MIGRATION_CONCURRENCY).map(async ({ id, photos }) => {
                    const migrated = await migratePhotoUrls(photos);
                    if (migrated.some((url, idx) => url !== photos[idx])) {
                        await propertyImportRepository.setPhotos(id, migrated);
                    }
                })
            );
        }
    } catch (err) {
        // Never surfaced: the response has already been sent. The boot sweep retries.
        logger.error({ err }, 'Background photo migration failed');
    }
}

export const propertyImportService = {
    buildTemplate: async () => buildTemplate(await propertiesService.getAmenities()),

    /**
     * Parses, validates and creates. Rejects the whole file if anything is wrong —
     * so a manager who fixes a row and re-uploads can never duplicate the rows that
     * were already fine, because nothing was written the first time.
     */
    import: async (buffer: Buffer, filename: string, managerId: string) => {
        const { rows, errors: structuralErrors } = await parseSheet(buffer, filename);
        if (structuralErrors.length) throw new ImportValidationError(rows.length, structuralErrors);

        const { properties, errors } = validateRows(rows);

        // Only worth the network round trip if the rows are otherwise sound.
        if (errors.length === 0) {
            const failures = await checkPhotoUrls(properties.flatMap(p => p.property.photos));
            for (const { rowNumber, property } of properties) {
                for (const url of property.photos) {
                    const message = failures.get(url);
                    if (message) errors.push({ row: rowNumber, column: 'photos', value: url, message });
                }
            }
        }

        if (errors.length) {
            errors.sort((a, b) => a.row - b.row);
            throw new ImportValidationError(rows.length, errors satisfies ImportRowError[]);
        }

        const known = await propertiesService.getAmenities();
        const normalised = properties.map(({ property }) => ({
            ...property,
            amenities: normaliseAmenities(property.amenities, known)
        }));

        const created = await propertyImportRepository.createMany(normalised, managerId);

        // Detached: the manager already has their answer. Photos stay hotlinked until
        // this finishes, and the boot sweep resumes it if the process dies first.
        void migrateInBackground(created.map(p => ({ id: p.id, photos: p.photos })));

        return { created: created.length, properties: created };
    },

    /** Finishes migrations interrupted by a restart. Called once on boot. */
    sweepUnmigratedPhotos: async () => {
        const pending = await propertyImportRepository.findWithUnmigratedPhotos(env.CLOUDINARY_CLOUD_NAME);
        if (pending.length === 0) return;
        logger.info({ count: pending.length }, 'Resuming interrupted photo migrations');
        await migrateInBackground(pending);
    }
};
