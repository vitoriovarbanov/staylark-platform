import { describe, expect, test } from 'vitest';
import { ImportValidationError } from './errors.js';

describe('ImportValidationError', () => {
    test('counts the distinct bad rows', () => {
        const error = new ImportValidationError(10, [
            { row: 3, column: 'city', value: '', message: 'City is required' },
            { row: 3, column: 'title', value: '', message: 'Title is required' },
            { row: 5, column: 'nightlyPrice', value: 'abc', message: 'Must be a number' }
        ]);
        expect(error.message).toBe('2 of 10 rows are invalid. No properties were created.');
    });

    // Structural problems are reported with no rows at all, so counting them would
    // read "1 of 0 rows are invalid" — nonsense for the case it exists to explain.
    test('uses the file-level message when there are no rows', () => {
        const error = new ImportValidationError(0, [
            { row: 1, column: null, value: null, message: 'The file is empty' }
        ]);
        expect(error.message).toBe('The file is empty. No properties were created.');
    });

    test('does not double the full stop on a file-level message', () => {
        const error = new ImportValidationError(0, [
            {
                row: 1,
                column: null,
                value: null,
                message: 'Missing required column(s): city. Download a fresh template.'
            }
        ]);
        expect(error.message).toBe(
            'Missing required column(s): city. Download a fresh template. No properties were created.'
        );
    });
});
