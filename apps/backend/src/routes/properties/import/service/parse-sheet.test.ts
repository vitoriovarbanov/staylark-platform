import { describe, expect, test } from 'vitest';
import writeXlsxFile from 'write-excel-file/node';
import { parseSheet, IMPORT_COLUMNS } from './parse-sheet.js';

async function xlsxBuffer(rows: string[][]): Promise<Buffer> {
    // write-excel-file v4 returns { toBuffer, toStream, toFile } rather than a Buffer.
    return writeXlsxFile(rows.map(row => row.map(value => ({ value, type: String })))).toBuffer();
}

const HEADER = [...IMPORT_COLUMNS];
const ROW_A = ['Flat A', 'Nice flat', 'APARTMENT', 'Sofia', '1 Main St', '100', '', '', '2', 'Wi-Fi', ''];

describe('parseSheet', () => {
    test('parses an xlsx file into keyed rows', async () => {
        const result = await parseSheet(await xlsxBuffer([HEADER, ROW_A]), 'properties.xlsx');
        expect(result.errors).toEqual([]);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toMatchObject({
            rowNumber: 2,
            cells: expect.objectContaining({ title: 'Flat A', city: 'Sofia', nightlyPrice: '100' })
        });
    });

    test('parses csv identically to xlsx', async () => {
        const csv = `${HEADER.join(',')}\n${ROW_A.join(',')}`;
        const result = await parseSheet(Buffer.from(csv, 'utf8'), 'properties.csv');
        expect(result.errors).toEqual([]);
        expect(result.rows[0]?.cells.title).toBe('Flat A');
    });

    test('numbers rows as they appear in the spreadsheet', async () => {
        const result = await parseSheet(await xlsxBuffer([HEADER, ROW_A, ROW_A]), 'p.xlsx');
        expect(result.rows.map(r => r.rowNumber)).toEqual([2, 3]);
    });

    test('reports a missing required header', async () => {
        const short = HEADER.filter(h => h !== 'city');
        const result = await parseSheet(await xlsxBuffer([short, ROW_A.slice(0, short.length)]), 'p.xlsx');
        expect(result.errors[0]?.message).toMatch(/city/);
        expect(result.rows).toEqual([]);
    });

    test('reports an unknown header', async () => {
        const result = await parseSheet(
            await xlsxBuffer([
                [...HEADER, 'wat'],
                [...ROW_A, 'x']
            ]),
            'p.xlsx'
        );
        expect(result.errors[0]?.message).toMatch(/wat/);
    });

    test('reports an empty file', async () => {
        const result = await parseSheet(await xlsxBuffer([HEADER]), 'p.xlsx');
        expect(result.errors[0]?.message).toMatch(/no data rows/i);
    });

    test('reports too many rows', async () => {
        const many = Array.from({ length: 101 }, () => ROW_A);
        const result = await parseSheet(await xlsxBuffer([HEADER, ...many]), 'p.xlsx');
        expect(result.errors[0]?.message).toMatch(/at most 100/i);
    });

    test('ignores fully blank rows', async () => {
        const blank = HEADER.map(() => '');
        const result = await parseSheet(await xlsxBuffer([HEADER, ROW_A, blank]), 'p.xlsx');
        expect(result.rows).toHaveLength(1);
    });

    test('rejects an unsupported extension', async () => {
        const result = await parseSheet(Buffer.from('x'), 'notes.txt');
        expect(result.errors[0]?.message).toMatch(/xlsx|csv/i);
    });
});
