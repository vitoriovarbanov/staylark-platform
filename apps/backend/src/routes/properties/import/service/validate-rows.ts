import { z } from 'zod';
import { CreatePropertySchema, checkPriceBounds } from '@staylark/contract';
import type { CreateProperty, ImportRowError } from '@staylark/contract';
import type { RawRow } from './parse-sheet.js';
import { parsePhotoCell } from './parse-photos.js';

/** A blank numeric cell means "not set", not zero — even for a required column. */
function numberOrUnset(raw: string): number | undefined {
    return raw === '' ? undefined : Number(raw);
}

const REQUIRED_LABELS: Record<string, string> = {
    title: 'Title is required',
    description: 'Description is required',
    city: 'City is required',
    address: 'Address is required',
    nightlyPrice: 'Nightly price is required'
};

/**
 * Turns Zod's developer-facing wording into something a property manager can act on.
 *
 * Raw Zod messages ("String must contain at least 1 character(s)", "Expected number,
 * received nan") name JavaScript types, not spreadsheet mistakes. This is the text a
 * non-technical manager reads while looking at their own file, so it has to say what
 * to change.
 */
function humanise(column: string, issue: z.ZodIssue): string {
    if (column === 'type') return 'Must be APARTMENT, HOUSE or HOTEL';

    if (issue.code === 'invalid_type') {
        // A blank numeric cell arrives as undefined rather than a number, so say the
        // value is missing instead of complaining about one the manager never typed.
        if (issue.received === 'undefined' && REQUIRED_LABELS[column]) return REQUIRED_LABELS[column];
        if (issue.expected === 'number') return 'Must be a number — no currency symbol or words';
    }

    if (issue.code === 'invalid_string' && issue.validation === 'url') {
        return 'Must be a valid URL';
    }

    if (issue.code === 'too_small') {
        if (REQUIRED_LABELS[column]) return REQUIRED_LABELS[column];
        if (column === 'nightlyPrice') return 'Must be greater than 0';
        if (column === 'maxGuests') return 'Must be at least 1';
        return 'This value is too small';
    }

    if (issue.code === 'too_big') {
        if (column === 'title') return 'Must be 200 characters or fewer';
        if (column === 'maxGuests') return 'Must be 20 or fewer';
        if (column === 'photos') return 'Too many photos for one property';
        return 'This value is too large';
    }

    if (issue.code === 'not_finite' || issue.code === 'invalid_literal') {
        return 'Must be a number — no currency symbol or words';
    }

    return issue.message;
}

/**
 * Validates parsed rows against the same contract schema the single-create endpoint
 * uses, so bulk import can never accept a property the form would reject, or vice
 * versa. Every row is checked — validation never short-circuits, because a manager
 * should see all the problems in one pass.
 */
export type ValidatedRow = { rowNumber: number; property: CreateProperty };

export function validateRows(rows: RawRow[]): { properties: ValidatedRow[]; errors: ImportRowError[] } {
    const properties: ValidatedRow[] = [];
    const errors: ImportRowError[] = [];

    for (const { rowNumber, cells } of rows) {
        const { urls, errors: photoErrors } = parsePhotoCell(cells.photos);
        for (const pe of photoErrors) {
            errors.push({ row: rowNumber, column: 'photos', value: pe.value, message: pe.message });
        }

        const candidate = {
            title: cells.title ?? '',
            description: cells.description ?? '',
            type: (cells.type ?? '').toUpperCase(),
            city: cells.city ?? '',
            address: cells.address ?? '',
            nightlyPrice: numberOrUnset(cells.nightlyPrice ?? ''),
            minNightlyPrice: numberOrUnset(cells.minNightlyPrice ?? ''),
            maxNightlyPrice: numberOrUnset(cells.maxNightlyPrice ?? ''),
            ...(cells.maxGuests ? { maxGuests: Number(cells.maxGuests) } : {}),
            amenities: (cells.amenities ?? '')
                .split(',')
                .map(a => a.trim())
                .filter(Boolean),
            photos: urls
        };

        const parsed = CreatePropertySchema.safeParse(candidate);
        if (!parsed.success) {
            for (const issue of parsed.error.errors) {
                const column = String(issue.path[0] ?? '');
                errors.push({
                    row: rowNumber,
                    column: column || null,
                    value: cells[column] ?? null,
                    message: humanise(column, issue)
                });
            }
            continue;
        }

        // Cross-field rule, shared with the single-create path.
        const boundsError = checkPriceBounds(parsed.data);
        if (boundsError) {
            const column = boundsError.startsWith('max') ? 'maxNightlyPrice' : 'minNightlyPrice';
            errors.push({ row: rowNumber, column, value: cells[column] ?? null, message: boundsError });
            continue;
        }

        // The row number travels with the property so later stages can report against
        // the manager's spreadsheet without relying on array positions lining up.
        if (photoErrors.length === 0) properties.push({ rowNumber, property: parsed.data });
    }

    return { properties, errors };
}
