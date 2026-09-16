import { describe, it, expect } from 'vitest';
import { UpdateMyProfileSchema } from './profile.js';

describe('UpdateMyProfileSchema', () => {
    it('accepts a full valid payload', () => {
        const r = UpdateMyProfileSchema.safeParse({
            bio: 'Nomad & coffee chaser',
            homeCity: 'Sofia',
            languages: ['English', 'Bulgarian'],
            phone: '+359888123456'
        });
        expect(r.success).toBe(true);
    });

    it('accepts an empty object (all optional)', () => {
        expect(UpdateMyProfileSchema.safeParse({}).success).toBe(true);
    });

    it('rejects a bio longer than 280 chars', () => {
        const r = UpdateMyProfileSchema.safeParse({ bio: 'x'.repeat(281) });
        expect(r.success).toBe(false);
    });

    it('rejects more than 8 languages', () => {
        const r = UpdateMyProfileSchema.safeParse({ languages: Array(9).fill('X') });
        expect(r.success).toBe(false);
    });

    it('accepts a formatted phone number', () => {
        expect(UpdateMyProfileSchema.safeParse({ phone: '+359 88 123 4567' }).success).toBe(true);
    });

    it('rejects a phone number with letters', () => {
        expect(UpdateMyProfileSchema.safeParse({ phone: 'not-a-phone-abc!!!' }).success).toBe(false);
    });

    it('rejects a phone number with too few digits', () => {
        expect(UpdateMyProfileSchema.safeParse({ phone: '12345' }).success).toBe(false);
    });

    it('allows phone to be null or omitted', () => {
        expect(UpdateMyProfileSchema.safeParse({ phone: null }).success).toBe(true);
        expect(UpdateMyProfileSchema.safeParse({}).success).toBe(true);
    });
});
