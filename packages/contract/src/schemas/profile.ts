import { z } from 'zod';

/**
 * A loose international phone check: optional leading +, then digits/spaces/()/-/.,
 * with 7–15 actual digits (E.164 caps at 15). An empty string is allowed so the FE
 * form (which uses '' for "untouched") validates; the API only ever receives a
 * trimmed value or null.
 */
const isValidPhone = (value: string): boolean => {
    if (value === '') return true;
    const digits = value.replace(/\D/g, '');
    return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
};

/** Self-service profile fields the user owns (app-specific; NOT name/image which Better Auth owns). */
export const UpdateMyProfileSchema = z.object({
    bio: z.string().max(280).nullish(),
    homeCity: z.string().max(100).nullish(),
    languages: z.array(z.string().min(1).max(40)).max(8).optional(),
    phone: z.string().max(40).refine(isValidPhone, { message: 'Enter a valid phone number' }).nullish()
});

export const MyProfileFieldsSchema = z.object({
    bio: z.string().nullable(),
    homeCity: z.string().nullable(),
    languages: z.array(z.string()),
    phone: z.string().nullable()
});

/** One country's stamp in the travel summary. */
export const CountryStatSchema = z.object({
    country: z.string(),
    flag: z.string(),
    cities: z.number().int().nonnegative(),
    nights: z.number().int().nonnegative()
});

/** One stay on the journey line (FE resolves x/y from route-data by city name). */
export const JourneyStopSchema = z.object({
    city: z.string(),
    nights: z.number().int().nonnegative(),
    lastStay: z.string().datetime() // most recent checkOut for this city
});

export const TravelStatsSchema = z.object({
    countries: z.number().int().nonnegative(),
    cities: z.number().int().nonnegative(),
    nights: z.number().int().nonnegative(),
    perCountry: z.array(CountryStatSchema),
    journey: z.array(JourneyStopSchema) // ordered by first visit ascending
});

export const MyProfileResponseSchema = z.object({
    profile: MyProfileFieldsSchema,
    stats: TravelStatsSchema
});

export type UpdateMyProfile = z.infer<typeof UpdateMyProfileSchema>;
export type MyProfileFields = z.infer<typeof MyProfileFieldsSchema>;
export type CountryStat = z.infer<typeof CountryStatSchema>;
export type JourneyStop = z.infer<typeof JourneyStopSchema>;
export type TravelStats = z.infer<typeof TravelStatsSchema>;
export type MyProfileResponse = z.infer<typeof MyProfileResponseSchema>;
