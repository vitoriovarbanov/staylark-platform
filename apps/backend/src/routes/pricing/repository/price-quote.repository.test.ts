import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { buildQuoteLogInput } from './price-quote.repository.js';

describe('buildQuoteLogInput', () => {
    it('maps quote fields to a Prisma create payload', () => {
        const row = buildQuoteLogInput({
            propertyId: 'p1',
            checkIn: '2026-07-10',
            checkOut: '2026-07-12',
            nights: 2,
            occupancy: 0.5,
            basePrice: new Prisma.Decimal('100.00'),
            totalPrice: new Prisma.Decimal('230.00'),
            modelVersion: '2026-05-13-v1'
        });
        expect(row.propertyId).toBe('p1');
        expect(row.nights).toBe(2);
        expect(row.occupancy).toBe(0.5);
        expect(row.checkIn).toEqual(new Date('2026-07-10'));
        expect(row.checkOut).toEqual(new Date('2026-07-12'));
        expect(row.basePrice.toString()).toBe('100');
        expect(row.totalPrice.toString()).toBe('230');
        expect(row.converted).toBe(false);
    });
});
