import readXlsxFile from 'read-excel-file/node';
import Papa from 'papaparse';
import { IMPORT_MAX_ROWS } from '@staylark/contract';
import type { ImportRowError } from '@staylark/contract';

/** Template column order. The generator and the parser must agree, so both read this. */
export const IMPORT_COLUMNS = [
    'title',
    'description',
    'type',
    'city',
    'address',
    'nightlyPrice',
    'minNightlyPrice',
    'maxNightlyPrice',
    'maxGuests',
    'amenities',
    'photos'
] as const;

export const REQUIRED_COLUMNS = ['title', 'description', 'type', 'city', 'address', 'nightlyPrice'] as const;

export type RawRow = { rowNumber: number; cells: Record<string, string> };

/** The sheet a manager fills in. Other sheets in the template are reference material. */
export const DATA_SHEET_NAME = 'Properties';

const HEADER_ROW_NUMBER = 1;

function toGrid(rows: unknown[][]): string[][] {
    return rows.map(row => row.map(cell => (cell == null ? '' : String(cell).trim())));
}

/**
 * read-excel-file v9 always returns every sheet as `[{ sheet, data }]` — its `sheet`
 * option is ignored — so pick the one we want here. Falls back to the first sheet so
 * a manager who rebuilt the file by hand, without our sheet names, still works.
 */
function selectDataSheet(sheets: { sheet: string; data: unknown[][] }[]): unknown[][] {
    const named = sheets.find(s => s.sheet === DATA_SHEET_NAME);
    return named?.data ?? sheets[0]?.data ?? [];
}

function fileError(message: string): ImportRowError {
    return { row: HEADER_ROW_NUMBER, column: null, value: null, message };
}

/**
 * Reads an uploaded spreadsheet into keyed rows. Structural problems (headers, row
 * count) are returned as errors with no rows; per-value validation happens later.
 *
 * `rowNumber` is the spreadsheet row, so error messages point at the row the
 * manager sees in Excel — the header is row 1, the first property is row 2.
 */
export async function parseSheet(
    buffer: Buffer,
    filename: string
): Promise<{ rows: RawRow[]; errors: ImportRowError[] }> {
    const lower = filename.toLowerCase();

    let grid: string[][];
    if (lower.endsWith('.xlsx')) {
        const sheets = (await readXlsxFile(buffer)) as unknown as { sheet: string; data: unknown[][] }[];
        grid = toGrid(selectDataSheet(sheets));
    } else if (lower.endsWith('.csv')) {
        // Excel writes a UTF-8 BOM when saving as CSV; it would corrupt the first header.
        const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
        grid = toGrid(parsed.data);
    } else {
        return { rows: [], errors: [fileError('File must be .xlsx or .csv')] };
    }

    const [header, ...dataRows] = grid;
    if (!header) return { rows: [], errors: [fileError('The file is empty')] };

    const errors: ImportRowError[] = [];

    const missing = REQUIRED_COLUMNS.filter(c => !header.includes(c));
    if (missing.length) {
        errors.push(fileError(`Missing required column(s): ${missing.join(', ')}. Download a fresh template.`));
    }
    const unknown = header.filter(h => h && !IMPORT_COLUMNS.includes(h as (typeof IMPORT_COLUMNS)[number]));
    if (unknown.length) {
        errors.push(fileError(`Unknown column(s): ${unknown.join(', ')}. Download a fresh template.`));
    }
    if (errors.length) return { rows: [], errors };

    // A manager who deletes rows in Excel leaves blank ones behind; they are not errors.
    const populated = dataRows
        .map((cells, i) => ({ rowNumber: i + 2, cells }))
        .filter(r => r.cells.some(c => c !== ''));

    if (populated.length === 0) return { rows: [], errors: [fileError('The file has no data rows')] };
    if (populated.length > IMPORT_MAX_ROWS) {
        return {
            rows: [],
            errors: [fileError(`A file may contain at most ${IMPORT_MAX_ROWS} properties (found ${populated.length})`)]
        };
    }

    const rows: RawRow[] = populated.map(({ rowNumber, cells }) => ({
        rowNumber,
        cells: Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']))
    }));

    return { rows, errors: [] };
}
