import { describe, it, expect } from 'vitest';
import { staySetting } from './stay-setting';

const stay = (description: string, amenities: string[] = [], title = 'A stay') => ({ title, description, amenities });

describe('staySetting', () => {
    it('reads the coast from the description or amenity tags', () => {
        expect(staySetting(stay('Steps from the Black Sea coast with a private garden.'))).toBe('coast');
        expect(staySetting(stay('Spacious house.', ['wifi', 'beach-access']))).toBe('coast');
    });

    it('reads the mountains from ski and slope words', () => {
        expect(staySetting(stay('Cozy hotel room near the ski slopes.'))).toBe('mountain');
        expect(staySetting(stay('Quiet room.', ['ski-storage']))).toBe('mountain');
    });

    it('reads the countryside', () => {
        expect(staySetting(stay('A stone cottage above the vineyards.'))).toBe('countryside');
    });

    it('defaults to the city', () => {
        expect(staySetting(stay('Quiet hotel room off the Ringstrasse, near the State Opera.'))).toBe('city');
    });

    it('matches whole words only', () => {
        // "season" and "bayonet" must not read as the sea or a bay
        expect(staySetting(stay('Prices move with the season. Bayonet bulbs throughout.'))).toBe('city');
    });
});
