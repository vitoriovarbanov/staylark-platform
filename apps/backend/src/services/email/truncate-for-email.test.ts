import { describe, it, expect } from 'vitest';
import { truncateForEmail } from './email.service.js';

const MAX = 600;

describe('truncateForEmail', () => {
    it('leaves a normal reply untouched', () => {
        const reply = 'We booked a plumber for tomorrow at 9am. Sorry for the trouble.';
        expect(truncateForEmail(reply)).toBe(reply);
    });

    it('preserves newlines — email has room for paragraphs, unlike a toast', () => {
        const reply = 'Hi,\n\nWe booked a plumber.\n\nThanks.';
        expect(truncateForEmail(reply)).toBe(reply);
    });

    it('trims surrounding whitespace', () => {
        expect(truncateForEmail('  \n Booked the plumber \n  ')).toBe('Booked the plumber');
    });

    it('truncates a pasted wall of text and marks it elided', () => {
        const result = truncateForEmail('x'.repeat(2000));

        expect(result).toBe(`${'x'.repeat(MAX)}…`);
        expect(result.length).toBe(MAX + 1);
    });

    it('does not append an ellipsis at exactly the limit', () => {
        const exact = 'y'.repeat(MAX);
        expect(truncateForEmail(exact)).toBe(exact);
    });

    it('is empty for a whitespace-only body', () => {
        expect(truncateForEmail('   \n\t ')).toBe('');
    });
});
