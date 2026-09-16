import { z } from 'zod';
import { PropertySchema } from './property.js';

/** Hard ceilings, shared so the frontend can reject oversized files before uploading. */
export const IMPORT_MAX_ROWS = 100;
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_PHOTOS_PER_ROW = 10;

/**
 * One problem with one cell. `row` is the *spreadsheet* row number — row 4 is row 4
 * in Excel, not the fourth data row — so a manager can navigate straight to it.
 * `column` is null for whole-file problems (missing header, too many rows).
 */
export const ImportRowErrorSchema = z.object({
    row: z.number().int().positive(),
    column: z.string().nullable(),
    value: z.string().nullable(),
    message: z.string()
});

export const ImportErrorDetailsSchema = z.object({
    rowCount: z.number().int().nonnegative(),
    errors: z.array(ImportRowErrorSchema)
});

export const ImportResultSchema = z.object({
    created: z.number().int().nonnegative(),
    properties: z.array(PropertySchema)
});

export type ImportRowError = z.infer<typeof ImportRowErrorSchema>;
export type ImportErrorDetails = z.infer<typeof ImportErrorDetailsSchema>;
export type ImportResult = z.infer<typeof ImportResultSchema>;
