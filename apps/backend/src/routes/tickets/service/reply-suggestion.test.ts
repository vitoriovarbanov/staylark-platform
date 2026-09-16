import { describe, it, expect } from 'vitest';
import { buildReplySuggestionPrompt } from './reply-suggestion.js';

const ticket = {
    userId: 'guest-1',
    transcription: 'No hot water since this morning.',
    summary: 'Guest reports no hot water.',
    category: 'UTILITIES' as const,
    priority: 'HIGH' as const,
    propertyTitle: 'Bansko Mountain Hotel',
    propertyCity: 'Bansko',
    status: 'OPEN' as const
};

const msg = (authorId: string, body: string) => ({ authorId, body });

describe('buildReplySuggestionPrompt', () => {
    it('labels reporter messages as Guest and others as Staff', () => {
        const out = buildReplySuggestionPrompt(ticket, [
            msg('guest-1', 'It is still cold.'),
            msg('mgr-1', 'Looking into it.')
        ]);
        expect(out).toContain('Guest: It is still cold.');
        expect(out).toContain('Staff: Looking into it.');
    });

    it('includes the problem summary and property', () => {
        const out = buildReplySuggestionPrompt(ticket, []);
        expect(out).toContain('Guest reports no hot water.');
        expect(out).toContain('Bansko Mountain Hotel');
    });

    it('notes an empty thread so the model drafts the first reply', () => {
        const out = buildReplySuggestionPrompt(ticket, []);
        expect(out).toContain('no replies yet');
    });

    it('truncates an absurdly long message body', () => {
        const out = buildReplySuggestionPrompt(ticket, [msg('guest-1', 'x'.repeat(5000))]);
        expect(out).toContain('…');
        expect(out.length).toBeLessThan(5000);
    });

    it('anchors the reply language on the guest’s original report by default', () => {
        const out = buildReplySuggestionPrompt(ticket, []);
        expect(out).toContain('No hot water since this morning.');
        expect(out).toContain('Write the staff reply now.');
    });

    it('forces the chosen language when one is passed', () => {
        const out = buildReplySuggestionPrompt(ticket, [], 'Bulgarian');
        expect(out).toContain('Write the staff reply now in Bulgarian');
        expect(out).not.toContain('Write the staff reply now.');
    });

    it('keeps only the last 20 messages', () => {
        const many = Array.from({ length: 25 }, (_, i) => msg('guest-1', `m${i}`));
        const out = buildReplySuggestionPrompt(ticket, many);
        // First 5 (m0–m4) are dropped; assert on the rendered line form.
        expect(out).not.toContain('Guest: m0');
        expect(out).not.toContain('Guest: m4');
        expect(out).toContain('Guest: m5');
        expect(out).toContain('Guest: m24');
    });
});
