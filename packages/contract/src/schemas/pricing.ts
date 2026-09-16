import { z } from 'zod';

// --- Enums ---

export const PricingRuleTypeEnum = z.enum([
    'SEASONAL',
    'OCCUPANCY',
    'DEMAND',
    'LAST_MINUTE',
    'DAY_OF_WEEK',
    'DURATION_DISCOUNT'
]);

// --- Schemas ---

export const PriceBreakdownNightSchema = z.object({
    date: z.string().date(),
    // Nonnegative (not positive) so legacy rows whose round(totalPrice/nights, 2) = 0.00
    // (or future free-night promos) round-trip through the read path.
    price: z.number().nonnegative(),
    appliedRules: z.array(z.string())
});

/**
 * Surfaces the single chosen DURATION_DISCOUNT rule for a stay so the FE can
 * render a clear "you saved €X" affordance (strikethrough + savings pill).
 * `null` when no duration rule fired for this stay.
 */
export const DurationDiscountAppliedSchema = z.object({
    ruleName: z.string().min(1),
    /** Integer percent off — e.g. multiplier 0.9 → percent 10. */
    percent: z.number().int().min(1).max(99),
    /** Sum of per-night prices BEFORE the duration multiplier was applied. */
    originalTotal: z.number().positive(),
    /**
     * The rule's night threshold (its `minNights`). Lets the UI express the
     * tier in a view-appropriate unit — the month-framed rule name in the
     * Monthly view, a week-framed label (e.g. 28 → "4+ weeks") in the nightly view.
     */
    minNights: z.number().int().positive()
});

export const PricingRequestSchema = z
    .object({
        propertyId: z.string().uuid(),
        checkIn: z.string().date(),
        checkOut: z.string().date()
    })
    .refine(data => data.checkOut > data.checkIn, {
        message: 'Check-out must be after check-in',
        path: ['checkOut']
    });

export const PricingResponseSchema = z.object({
    propertyId: z.string().uuid(),
    basePrice: z.number().positive(),
    dynamicPrice: z.number().positive(),
    breakdown: z.array(PriceBreakdownNightSchema),
    totalPrice: z.number().positive(),
    nights: z.number().int().positive(),
    modelVersion: z.string(),
    durationDiscount: DurationDiscountAppliedSchema.nullable()
});

export const PricingQuerySchema = z
    .object({
        checkIn: z.string().date(),
        checkOut: z.string().date()
    })
    .refine(data => data.checkOut > data.checkIn, {
        message: 'Check-out must be after check-in',
        path: ['checkOut']
    });
// --- Pricing rule (admin override) schemas ---

/**
 * Normalized rule name: trims leading/trailing whitespace and collapses runs
 * of internal whitespace to a single space. Applied at the write boundary
 * (Create + Update) so persisted names are always tidy. Does NOT auto-edit
 * intentional typography like `( 7 days)` (single space after the paren).
 * Length bounds applied AFTER normalization.
 */
const normalizedRuleName = z
    .string()
    .transform(s => s.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(1).max(200));

export const PricingRuleSchema = z.object({
    id: z.string().uuid(),
    propertyId: z.string().uuid().nullable(),
    name: z.string().min(1).max(200),
    type: PricingRuleTypeEnum,
    multiplier: z.number().min(0.5).max(2.0),
    startDate: z.string().date(),
    endDate: z.string().date(),
    isActive: z.boolean(),
    minNights: z.number().int().min(2).max(365).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export const PricingRuleCreateSchema = z
    .object({
        propertyId: z.string().uuid().nullish(),
        name: normalizedRuleName,
        type: PricingRuleTypeEnum,
        multiplier: z.number().min(0.5).max(2.0),
        startDate: z.string().date(),
        endDate: z.string().date(),
        isActive: z.boolean().optional(),
        minNights: z.number().int().min(2).max(365).nullish()
    })
    .refine(d => d.startDate <= d.endDate, {
        message: 'startDate must be on or before endDate',
        path: ['endDate']
    })
    .superRefine((d, ctx) => {
        const isDuration = d.type === 'DURATION_DISCOUNT';
        const hasMinNights = d.minNights !== undefined && d.minNights !== null;
        if (isDuration && !hasMinNights) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['minNights'],
                message: 'minNights is required for DURATION_DISCOUNT (>= 2)'
            });
        }
        if (!isDuration && hasMinNights) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['minNights'],
                message: 'minNights only applies to DURATION_DISCOUNT rules'
            });
        }
        // A duration discount must actually discount — multiplier strictly below 1.
        // Otherwise the engine would raise the price while the FE renders it as a
        // "you saved" affordance (negative savings / bogus −X% pill).
        if (isDuration && d.multiplier >= 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['multiplier'],
                message: 'DURATION_DISCOUNT multiplier must be below 1 (a discount)'
            });
        }
    });

export const PricingRuleUpdateSchema = z
    .object({
        name: normalizedRuleName.optional(),
        type: PricingRuleTypeEnum.optional(),
        multiplier: z.number().min(0.5).max(2.0).optional(),
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
        isActive: z.boolean().optional(),
        minNights: z.number().int().min(2).max(365).nullable().optional()
    })
    .strict()
    .refine(obj => Object.keys(obj).length > 0, { message: 'At least one field is required' })
    .refine(d => !d.startDate || !d.endDate || d.startDate <= d.endDate, {
        message: 'startDate must be on or before endDate',
        path: ['endDate']
    })
    .superRefine((d, ctx) => {
        // Best-effort checks on the fields present in this patch. Because PATCH is
        // partial, the *merged* (existing row + patch) type/minNights/multiplier
        // invariant is enforced authoritatively in the service (updateRule); these
        // catch contradictions visible within the patch itself.
        const hasMinNights = d.minNights !== undefined && d.minNights !== null;
        if (d.type === 'DURATION_DISCOUNT') {
            if (d.minNights === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['minNights'],
                    message: 'minNights is required for DURATION_DISCOUNT (>= 2)'
                });
            }
            if (d.multiplier !== undefined && d.multiplier >= 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['multiplier'],
                    message: 'DURATION_DISCOUNT multiplier must be below 1 (a discount)'
                });
            }
        }
        if (d.type !== undefined && d.type !== 'DURATION_DISCOUNT' && hasMinNights) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['minNights'],
                message: 'minNights only applies to DURATION_DISCOUNT rules'
            });
        }
    });

// z.coerce.boolean() treats the string "false" as truthy (any non-empty string).
// Use an explicit string→boolean transform so query-string `?includeInactive=false`
// parses to literal `false`.
const queryBoolean = z
    .union([z.boolean(), z.enum(['true', 'false']).transform(v => v === 'true')])
    .optional()
    .default(false);

export const PricingRuleListQuerySchema = z.object({
    propertyId: z.string().uuid().optional(),
    activeOn: z.string().date().optional(),
    includeInactive: queryBoolean,
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const PricingRulesListResponseSchema = z.object({
    data: z.array(PricingRuleSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive()
});

export const PricingModelMetadataSchema = z.object({
    modelVersion: z.string(),
    trainedAt: z.string(),
    dataSource: z.enum(['synthetic', 'real']),
    rSquared: z.number(),
    note: z.string()
});

export const PricingRuleIdParamsSchema = z.object({
    id: z.string().uuid()
});

// 409 PRICE_DRIFT details payload — emitted by PriceDriftError in bookings flow.
export const PriceDriftDetailsSchema = z.object({
    newTotal: z.number().positive(),
    expectedTotal: z.number().positive()
});

// --- Types ---

export type PricingRequest = z.infer<typeof PricingRequestSchema>;
export type PricingResponse = z.infer<typeof PricingResponseSchema>;
export type PricingQuery = z.infer<typeof PricingQuerySchema>;
export type PricingRuleType = z.infer<typeof PricingRuleTypeEnum>;
export type PricingRule = z.infer<typeof PricingRuleSchema>;
export type PricingRuleCreate = z.infer<typeof PricingRuleCreateSchema>;
export type PricingRuleUpdate = z.infer<typeof PricingRuleUpdateSchema>;
export type PricingRuleListQuery = z.infer<typeof PricingRuleListQuerySchema>;
export type PricingRulesListResponse = z.infer<typeof PricingRulesListResponseSchema>;
export type PricingModelMetadata = z.infer<typeof PricingModelMetadataSchema>;
export type PriceDriftDetails = z.infer<typeof PriceDriftDetailsSchema>;
export type PriceBreakdownNight = z.infer<typeof PriceBreakdownNightSchema>;
export type DurationDiscountApplied = z.infer<typeof DurationDiscountAppliedSchema>;
