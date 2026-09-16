import { IMPORT_MAX_PHOTOS_PER_ROW } from '@staylark/contract';

export type PhotoCellError = { value: string; message: string };

/**
 * Splits a `photos` cell into URLs. Managers separate with alt+enter (newline) in
 * Excel, or with commas after a save-as-CSV round trip, so both are accepted.
 * Collects every problem rather than stopping at the first — a manager should fix
 * one row once.
 */
export function parsePhotoCell(cell: string | null | undefined): { urls: string[]; errors: PhotoCellError[] } {
    const errors: PhotoCellError[] = [];
    if (!cell) return { urls: [], errors };

    const candidates = [
        ...new Set(
            cell
                .split(/[\n,]/)
                .map(s => s.trim())
                .filter(Boolean)
        )
    ];

    const urls: string[] = [];
    for (const candidate of candidates) {
        let parsed: URL;
        try {
            parsed = new URL(candidate);
        } catch {
            errors.push({ value: candidate, message: 'Not a valid URL' });
            continue;
        }
        // https only: these become server-side fetch targets, and plaintext
        // fetches of manager-supplied hosts are not worth the exposure.
        if (parsed.protocol !== 'https:') {
            errors.push({ value: candidate, message: 'Photo URLs must start with https://' });
            continue;
        }
        urls.push(candidate);
    }

    if (urls.length > IMPORT_MAX_PHOTOS_PER_ROW) {
        errors.push({
            value: String(urls.length),
            message: `A property may have at most ${IMPORT_MAX_PHOTOS_PER_ROW} photos`
        });
    }

    return { urls, errors };
}
