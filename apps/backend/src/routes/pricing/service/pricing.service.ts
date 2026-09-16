import { Prisma } from '@prisma/client';
import { predictMultiplier, loadModel, type PricingModel } from './pricing.model.js';
import { clamp, roundHalfEven } from './pricing.math.js';
import { MIN_MULTIPLIER, MAX_MULTIPLIER, CACHE_TTL_MS, MAX_STAY_NIGHTS } from './pricing.config.js';
import { pricingRepository, type ActiveOverride } from '../repository/pricing.repository.js';
import { priceQuoteRepository } from '../repository/price-quote.repository.js';
import { NotFoundError, AppError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import type { PricingResponse } from '@staylark/contract';

export interface QuoteForNightInput {
    model: PricingModel;
    basePrice: Prisma.Decimal;
    occupancy: number;
    daysToCheckIn: number;
    isWeekend: 0 | 1;
    month: number;
    overrides: ActiveOverride[];
    bounds: { min: Prisma.Decimal | null; max: Prisma.Decimal | null };
}

export interface NightQuote {
    price: Prisma.Decimal;
    appliedRules: string[];
}

export const quoteForNight = (input: QuoteForNightInput): NightQuote => {
    const mlMultiplier = predictMultiplier(input.model, {
        occupancy: input.occupancy,
        daysToCheckIn: input.daysToCheckIn,
        isWeekend: input.isWeekend,
        month: input.month
    });

    const overrideProduct = input.overrides.reduce((acc, o) => acc * o.multiplier.toNumber(), 1);

    const composedRaw = mlMultiplier * overrideProduct;
    const composedCapped = clamp(composedRaw, MIN_MULTIPLIER, MAX_MULTIPLIER);

    const preliminary = input.basePrice.mul(composedCapped);

    let final = preliminary;
    if (input.bounds.min != null && final.lessThan(input.bounds.min)) final = input.bounds.min;
    if (input.bounds.max != null && final.greaterThan(input.bounds.max)) final = input.bounds.max;

    const rounded = new Prisma.Decimal(roundHalfEven(final.toNumber(), 2));

    return {
        price: rounded,
        appliedRules: ['ML model', ...input.overrides.map(o => o.name)]
    };
};

interface CacheEntry {
    value: PricingResponse;
    // Occupancy is snapshotted alongside the response so impressions can be logged
    // on cache HITS too — occupancy isn't part of the guest-facing PricingResponse
    // and isn't recomputed on a hit. Without it, popular (cached) property+dates
    // would log one impression per TTL window instead of one per guest view,
    // making the conversion rate (the whole point of PriceQuote) uncomputable.
    occupancy: number;
    expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

// Fire-and-forget: record one guest impression per quote request. Never awaited —
// a logging failure or its latency must not touch the guest-facing price. Called
// on both cache hit and miss so impressions aren't undercounted for popular dates.
const logImpressionRow = (checkIn: string, checkOut: string, occupancy: number, r: PricingResponse): void => {
    void priceQuoteRepository
        .logQuote({
            propertyId: r.propertyId,
            checkIn,
            checkOut,
            nights: r.nights,
            occupancy,
            basePrice: new Prisma.Decimal(r.basePrice),
            totalPrice: new Prisma.Decimal(r.totalPrice),
            modelVersion: r.modelVersion
        })
        .catch(err => logger.warn({ err, propertyId: r.propertyId }, 'priceQuote.log.failed'));
};

const cacheKey = (propertyId: string, checkIn: string, checkOut: string) => `${propertyId}:${checkIn}:${checkOut}`;

const countNights = (checkIn: string, checkOut: string) =>
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);

const datesInRange = (checkIn: string, checkOut: string): Date[] => {
    const dates: Date[] = [];
    const cursor = new Date(checkIn);
    const end = new Date(checkOut);
    while (cursor < end) {
        dates.push(new Date(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
};

export const pricingService = {
    quote: async (
        propertyId: string,
        checkIn: string,
        checkOut: string,
        opts?: { logImpression?: boolean }
    ): Promise<PricingResponse> => {
        // Booking creation re-quotes for server-side validation — that's not a guest
        // impression, so it passes logImpression:false to avoid phantom/duplicate rows.
        const logImpression = opts?.logImpression ?? true;
        const key = cacheKey(propertyId, checkIn, checkOut);
        const hit = cache.get(key);
        if (hit && hit.expiresAt > Date.now()) {
            if (logImpression) logImpressionRow(checkIn, checkOut, hit.occupancy, hit.value);
            return hit.value;
        }

        const property = await pricingRepository.findProperty(propertyId);
        if (!property) throw new NotFoundError('Property not found');

        const model = loadModel();
        const basePrice = property.nightlyPrice;

        const nights = countNights(checkIn, checkOut);
        if (nights < 1 || nights > MAX_STAY_NIGHTS) {
            throw new AppError(`Stay length must be between 1 and ${MAX_STAY_NIGHTS} nights`, 400);
        }

        const fromDate = new Date(checkIn);
        const toDate = new Date(checkOut);

        const [occupancy, rangeOverrides] = await Promise.all([
            pricingRepository.computeOccupancyRate(propertyId, fromDate),
            pricingRepository.findActiveOverridesInRange(propertyId, fromDate, toDate)
        ]);

        const nowMs = Date.now();
        const breakdown = datesInRange(checkIn, checkOut).map(date => {
            const overrides = rangeOverrides.filter(o => o.startDate <= date && o.endDate >= date);
            const daysToCheckIn = Math.max(0, Math.floor((date.getTime() - nowMs) / 86_400_000));
            const dayOfWeek = date.getUTCDay();
            const isWeekend: 0 | 1 = dayOfWeek === 5 || dayOfWeek === 6 ? 1 : 0;
            const month = date.getUTCMonth() + 1;

            const night = quoteForNight({
                model,
                basePrice,
                occupancy,
                daysToCheckIn,
                isWeekend,
                month,
                overrides,
                bounds: { min: property.minNightlyPrice, max: property.maxNightlyPrice }
            });

            return {
                date: date.toISOString().slice(0, 10),
                price: night.price.toNumber(),
                appliedRules: night.appliedRules
            };
        });

        // PRICE-007: Single best-tier DURATION_DISCOUNT applied per-night, post-cap and
        // post-bounds. The duration multiplier can push prices below the property's
        // minNightlyPrice — matches Airbnb's behavior (host warned, not blocked).
        const durationRule = await pricingRepository.findDurationDiscountForStay(propertyId, fromDate, toDate, nights);

        let durationDiscount: PricingResponse['durationDiscount'] = null;
        // Guard against legacy/bad data: a duration rule with multiplier >= 1 would
        // raise the price, not discount it. Treat it as "no discount" so we never
        // surface a negative-savings affordance. Write-path validation now prevents
        // creating such rules, but this protects rows that predate that guard.
        if (durationRule && durationRule.multiplier.toNumber() < 1) {
            const multiplier = durationRule.multiplier.toNumber();
            // Capture pre-discount total so the FE can render a strikethrough.
            const originalTotal = breakdown.reduce((sum, b) => sum + b.price, 0);
            for (const night of breakdown) {
                night.price = roundHalfEven(night.price * multiplier, 2);
                night.appliedRules = [...night.appliedRules, durationRule.name];
            }
            // Integer percent off, e.g. multiplier 0.9 → 10. Clamp to [1, 99] so the
            // schema (.min(1).max(99)) never rejects edge rounding.
            const percent = Math.min(99, Math.max(1, Math.round((1 - multiplier) * 100)));
            durationDiscount = {
                ruleName: durationRule.name,
                percent,
                originalTotal: Number(originalTotal.toFixed(2)),
                minNights: durationRule.minNights
            };
        }

        const totalPrice = breakdown.reduce((sum, b) => sum + b.price, 0);
        const avgDynamicPrice = totalPrice / nights;

        const response: PricingResponse = {
            propertyId,
            basePrice: basePrice.toNumber(),
            dynamicPrice: Number(avgDynamicPrice.toFixed(2)),
            breakdown,
            totalPrice: Number(totalPrice.toFixed(2)),
            nights,
            modelVersion: model.modelVersion,
            durationDiscount
        };

        cache.set(key, { value: response, occupancy, expiresAt: Date.now() + CACHE_TTL_MS });

        // Capture the quote for future real-data training (fire-and-forget).
        if (logImpression) logImpressionRow(checkIn, checkOut, occupancy, response);

        return response;
    },

    invalidateCache: (propertyId?: string) => {
        if (!propertyId) {
            cache.clear();
            return;
        }
        for (const k of cache.keys()) if (k.startsWith(`${propertyId}:`)) cache.delete(k);
    }
};
