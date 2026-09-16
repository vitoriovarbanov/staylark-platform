import { describe, it, expect } from 'vitest';
import { messageExcerpt, MAX_EXCERPT_CHARS } from './message-excerpt';

describe('messageExcerpt', () => {
    it('returns a short body unchanged', () => {
        expect(messageExcerpt('Plumber booked for tomorrow at 9am.')).toBe('Plumber booked for tomorrow at 9am.');
    });

    it('collapses newlines so the toast stays one readable line', () => {
        expect(messageExcerpt('Hi there,\n\nWe booked a plumber.\nHe arrives at 9am.')).toBe(
            'Hi there, We booked a plumber. He arrives at 9am.'
        );
    });

    it('collapses runs of whitespace and tabs', () => {
        expect(messageExcerpt('Booked\t\tthe   plumber')).toBe('Booked the plumber');
    });

    it('trims leading and trailing whitespace', () => {
        expect(messageExcerpt('  \n Booked the plumber \n ')).toBe('Booked the plumber');
    });

    it('truncates a long body and appends an ellipsis', () => {
        const long = 'word '.repeat(200);
        const result = messageExcerpt(long);

        expect(result.endsWith('…')).toBe(true);
        expect(result.length).toBeLessThanOrEqual(MAX_EXCERPT_CHARS + 1);
    });

    it('cuts on a word boundary rather than mid-word', () => {
        const body = `${'a'.repeat(50)} ${'b'.repeat(50)} ${'c'.repeat(50)}`;
        const result = messageExcerpt(body);

        // Whatever it kept, it must not end with a partial run of characters.
        expect(result).toBe(`${'a'.repeat(50)} ${'b'.repeat(50)}…`);
    });

    it('hard-cuts a single unbroken word that exceeds the limit', () => {
        const result = messageExcerpt('x'.repeat(500));

        expect(result).toBe(`${'x'.repeat(MAX_EXCERPT_CHARS)}…`);
    });

    it('does not append an ellipsis at exactly the limit', () => {
        const exact = 'y'.repeat(MAX_EXCERPT_CHARS);

        expect(messageExcerpt(exact)).toBe(exact);
    });

    it('returns an empty string for a whitespace-only body', () => {
        expect(messageExcerpt('   \n\t  ')).toBe('');
    });

    it('respects a caller-supplied limit', () => {
        expect(messageExcerpt('one two three four five', 7)).toBe('one two…');
    });
});
