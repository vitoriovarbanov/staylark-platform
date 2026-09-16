import writeXlsxFile from 'write-excel-file/node';
import { PropertyTypeEnum, IMPORT_MAX_ROWS, IMPORT_MAX_PHOTOS_PER_ROW } from '@staylark/contract';
import { IMPORT_COLUMNS, REQUIRED_COLUMNS, DATA_SHEET_NAME } from './parse-sheet.js';

type Cell = { value: string; type: StringConstructor; fontWeight?: 'bold' };

const text = (value: string): Cell => ({ value, type: String });
const bold = (value: string): Cell => ({ value, type: String, fontWeight: 'bold' });

const NOTES: Record<string, string> = {
    title: 'Up to 200 characters.',
    description: 'Shown on the property page.',
    type: 'One of APARTMENT, HOUSE, HOTEL.',
    city: 'City name as guests would search for it.',
    address: 'Street address.',
    nightlyPrice: 'Number, greater than 0. No currency symbol.',
    minNightlyPrice: 'Optional pricing floor. Must not exceed nightlyPrice.',
    maxNightlyPrice: 'Optional pricing ceiling. Must not be below nightlyPrice.',
    maxGuests: 'Optional whole number, 1-20. Defaults to 4.',
    amenities: 'Comma-separated. New values are allowed.',
    photos: `Up to ${IMPORT_MAX_PHOTOS_PER_ROW} https:// image URLs, one per line (alt+enter) or comma-separated. We download them and re-host them.`
};

const EXAMPLE_ROWS: Record<string, string>[] = [
    {
        title: 'Sunny 2-bedroom near Vitosha',
        description: 'Bright top-floor flat with a balcony, five minutes from the metro.',
        type: 'APARTMENT',
        city: 'Sofia',
        address: 'ul. Vitosha 12, ap. 8',
        nightlyPrice: '120',
        minNightlyPrice: '90',
        maxNightlyPrice: '180',
        maxGuests: '4',
        amenities: 'Wi-Fi, Parking, Air conditioning',
        photos: 'https://example.com/photos/flat-1.jpg\nhttps://example.com/photos/flat-2.jpg'
    },
    {
        title: 'Seaside house with garden',
        description: 'Detached house a short walk from the beach, private garden and parking.',
        type: 'HOUSE',
        city: 'Varna',
        address: 'ul. Primorska 4',
        nightlyPrice: '200',
        minNightlyPrice: '',
        maxNightlyPrice: '',
        maxGuests: '6',
        amenities: 'Wi-Fi, Parking',
        photos: 'https://example.com/photos/house-1.jpg'
    }
];

export const TEMPLATE_FILENAME = 'staylark-properties-template.xlsx';

/**
 * Builds the import template. Generated per request rather than committed as a
 * static asset, so the amenity suggestions always reflect the live catalogue and
 * the header can never drift from IMPORT_COLUMNS.
 *
 * write-excel-file has no native data-validation dropdowns, so the Reference sheet
 * carries the valid values instead. Server-side validation is the real enforcement.
 */
export async function buildTemplate(knownAmenities: string[]): Promise<Buffer> {
    const header = IMPORT_COLUMNS.map(c => bold(c));

    const reference: Cell[][] = [
        [bold('Column'), bold('Required'), bold('Notes')],
        ...IMPORT_COLUMNS.map(column => [
            text(column),
            text(REQUIRED_COLUMNS.includes(column as (typeof REQUIRED_COLUMNS)[number]) ? 'yes' : 'no'),
            text(NOTES[column] ?? '')
        ]),
        [text('')],
        [bold('Property types')],
        ...PropertyTypeEnum.options.map(t => [text(t)]),
        [text('')],
        [bold('Amenities already in use')],
        [text('These are suggestions, not a fixed list. Any new value you type is accepted.')],
        ...(knownAmenities.length ? knownAmenities.map(a => [text(a)]) : [[text('(none yet)')]]),
        [text('')],
        [text(`You may import up to ${IMPORT_MAX_ROWS} properties per file.`)]
    ];

    const example: Cell[][] = [header, ...EXAMPLE_ROWS.map(row => IMPORT_COLUMNS.map(c => text(row[c] ?? '')))];

    return writeXlsxFile([
        { sheet: DATA_SHEET_NAME, data: [header], stickyRowsCount: 1 },
        { sheet: 'Reference', data: reference },
        { sheet: 'Example', data: example }
    ]).toBuffer();
}
