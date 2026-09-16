import { describe, expect, test } from 'vitest';
import readXlsxFile from 'read-excel-file/node';
import writeXlsxFile from 'write-excel-file/node';
import { buildTemplate } from './build-template.js';
import { parseSheet, IMPORT_COLUMNS, DATA_SHEET_NAME } from './parse-sheet.js';
import { validateRows } from './validate-rows.js';

type SheetOut = { sheet: string; data: unknown[][] };

async function sheets(buffer: Buffer): Promise<SheetOut[]> {
    return (await readXlsxFile(buffer)) as unknown as SheetOut[];
}

function sheetNamed(all: SheetOut[], name: string): unknown[][] {
    const found = all.find(s => s.sheet === name);
    if (!found) throw new Error(`No sheet named ${name}. Got: ${all.map(s => s.sheet).join(', ')}`);
    return found.data;
}

describe('buildTemplate', () => {
    test('produces a Properties sheet whose header matches the parser exactly', async () => {
        const all = await sheets(await buildTemplate(['Wi-Fi', 'Parking']));
        expect(sheetNamed(all, DATA_SHEET_NAME)[0]).toEqual([...IMPORT_COLUMNS]);
    });

    test('has all three sheets', async () => {
        const all = await sheets(await buildTemplate([]));
        expect(all.map(s => s.sheet)).toEqual([DATA_SHEET_NAME, 'Reference', 'Example']);
    });

    test('round-trips: a template filled with one row parses cleanly', async () => {
        const all = await sheets(await buildTemplate(['Wi-Fi']));
        const header = sheetNamed(all, DATA_SHEET_NAME)[0] as string[];

        const values: Record<string, string> = {
            title: 'Flat A',
            description: 'Nice flat',
            type: 'APARTMENT',
            city: 'Sofia',
            address: '1 Main St',
            nightlyPrice: '100',
            minNightlyPrice: '',
            maxNightlyPrice: '',
            maxGuests: '2',
            amenities: 'Wi-Fi',
            photos: ''
        };
        const filled = await writeXlsxFile([
            {
                sheet: DATA_SHEET_NAME,
                data: [
                    header.map(h => ({ value: h, type: String })),
                    header.map(h => ({ value: values[h] ?? '', type: String }))
                ]
            }
        ]).toBuffer();

        const { rows, errors } = await parseSheet(filled, 'filled.xlsx');
        expect(errors).toEqual([]);
        expect(rows[0]?.cells.title).toBe('Flat A');
        expect(rows[0]?.rowNumber).toBe(2);
    });

    test('lists the amenity suggestions on the Reference sheet', async () => {
        const all = await sheets(await buildTemplate(['Sauna']));
        expect(JSON.stringify(sheetNamed(all, 'Reference'))).toContain('Sauna');
    });

    test('includes the property types on the Reference sheet', async () => {
        const all = await sheets(await buildTemplate([]));
        const flat = JSON.stringify(sheetNamed(all, 'Reference'));
        expect(flat).toContain('APARTMENT');
        expect(flat).toContain('HOUSE');
        expect(flat).toContain('HOTEL');
    });

    test('says the amenity list is a suggestion, not a whitelist', async () => {
        const all = await sheets(await buildTemplate(['Wi-Fi']));
        expect(JSON.stringify(sheetNamed(all, 'Reference'))).toMatch(/suggestion/i);
    });

    test('the Example sheet rows themselves pass validation', async () => {
        const buffer = await buildTemplate([]);
        const all = await sheets(buffer);
        const example = sheetNamed(all, 'Example');
        expect(example.length).toBeGreaterThan(1);

        // Rebuild the example rows as a Properties sheet and run them through the parser.
        const asImport = await writeXlsxFile([
            {
                sheet: DATA_SHEET_NAME,
                data: example.map(row => row.map(cell => ({ value: cell == null ? '' : String(cell), type: String })))
            }
        ]).toBuffer();

        const { rows, errors } = await parseSheet(asImport, 'example.xlsx');
        expect(errors).toEqual([]);
        expect(rows).toHaveLength(example.length - 1);

        // Parsing is not enough — the example we ship a manager must actually validate.
        const validated = validateRows(rows);
        expect(validated.errors).toEqual([]);
        expect(validated.properties).toHaveLength(example.length - 1);
    });
});
