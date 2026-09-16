import { z } from 'zod';
import { sortSchema } from './list-query.js';

// --- Enums ---

export const FeedbackSentimentEnum = z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']);

// --- Schemas ---

export const FeedbackSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    propertyId: z.string().uuid(),
    bookingId: z.string().uuid(),
    audioUrl: z.string().url().nullable(),
    transcription: z.string().nullable(),
    sentiment: FeedbackSentimentEnum.nullable(),
    topics: z.array(z.string()).nullable(),
    score: z.number().int().min(1).max(5).nullable(),
    summary: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

/** Body fields sent alongside the audio file in multipart/form-data */
export const CreateFeedbackSchema = z.object({
    propertyId: z.string().uuid(),
    bookingId: z.string().uuid(),
    text: z.string().min(10, 'Feedback must be at least 10 characters').max(2000).optional()
});

/** A single booking eligible for feedback */
export const EligibleBookingSchema = z.object({
    bookingId: z.string().uuid(),
    propertyId: z.string().uuid(),
    propertyName: z.string(),
    propertyCity: z.string(),
    checkOutDate: z.string()
});

/** Response from GET /api/feedback/eligible */
export const EligibleFeedbackResponseSchema = z.object({
    eligibleBookings: z.array(EligibleBookingSchema)
});

/** Route params for feedback endpoints that take a bookingId */
export const FeedbackBookingParamsSchema = z.object({
    bookingId: z.string().uuid()
});

/** Route params for feedback endpoints that take a propertyId */
export const FeedbackPropertyParamsSchema = z.object({
    propertyId: z.string().uuid()
});

/** Public sort fields for the admin feedback list — shared by the FE SortControl + BE field map. */
export const FEEDBACK_SORT_FIELDS = ['createdAt'] as const;

/** Query params for admin feedback aggregation */
export const FeedbackAggregationQuerySchema = z
    .object({
        startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
            .optional(),
        endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
            .optional(),
        // page/limit are intentionally optional with no defaults here (repo defaults to
        // page=1, limit=10). Not merged with PaginationSchema to preserve that behavior.
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(50).optional()
    })
    .merge(sortSchema(FEEDBACK_SORT_FIELDS));

/** Single data point for the feedback-over-time trend chart */
export const FeedbackOverTimeEntrySchema = z.object({
    period: z.string(), // ISO week start date (YYYY-MM-DD)
    count: z.number().int(),
    averageScore: z.number().min(0).max(5),
    positive: z.number().int(),
    neutral: z.number().int(),
    negative: z.number().int()
});

/** Topic with count and dominant sentiment for colored bars */
export const TopicWithSentimentSchema = z.object({
    topic: z.string(),
    count: z.number().int(),
    dominantSentiment: FeedbackSentimentEnum
});

/** Synchronous analysis produced at submission (sentiment + score only). */
export const FeedbackAnalysisSchema = z.object({
    sentiment: FeedbackSentimentEnum,
    score: z.number().int().min(1).max(5)
});

/** Result of the self-hosted classifier service (/classify). */
export const ClassifyResultSchema = FeedbackAnalysisSchema;

/** Result of the extractive summary service (/summarize). */
export const SummaryResultSchema = z.object({
    summary: z.string().nullable()
});

/** Result of the embedding aspect tagger (/aspects) — topic chips for one review. */
export const AspectsResultSchema = z.object({
    topics: z.array(z.string())
});

/** Counts of feedback at each 1–5 score bucket (zero-filled) */
export const ScoreDistributionSchema = z.object({
    '1': z.number().int(),
    '2': z.number().int(),
    '3': z.number().int(),
    '4': z.number().int(),
    '5': z.number().int()
});

/**
 * Summary stats for the immediately-preceding equal-length window, used to render
 * period-over-period deltas. Null when no date range is selected (all-time view).
 */
export const FeedbackPreviousWindowSchema = z.object({
    totalCount: z.number().int(),
    averageScore: z.number().min(0).max(5),
    negativeRate: z.number().min(0).max(1),
    responseRate: z.number().min(0).max(1).nullable()
});

/** Admin aggregation response for a property's feedback */
export const FeedbackAggregationSchema = z.object({
    totalCount: z.number().int(),
    averageScore: z.number().min(0).max(5),
    sentimentBreakdown: z.object({
        POSITIVE: z.number().int(),
        NEUTRAL: z.number().int(),
        NEGATIVE: z.number().int()
    }),
    topTopics: z.array(TopicWithSentimentSchema),
    feedbackOverTime: z.array(FeedbackOverTimeEntrySchema),
    feedbacks: z.array(FeedbackSchema),
    totalPages: z.number().int(),
    // --- Metrics-expansion additions (read-only, derived) ---
    responseRate: z.number().min(0).max(1).nullable(),
    completedBookings: z.number().int(),
    negativeRate: z.number().min(0).max(1),
    voiceCount: z.number().int(),
    textCount: z.number().int(),
    avgDaysToFeedback: z.number().nullable(),
    scoreDistribution: ScoreDistributionSchema,
    needsAttention: z.array(FeedbackSchema),
    previous: FeedbackPreviousWindowSchema.nullable()
});

// --- Types ---

export type Feedback = z.infer<typeof FeedbackSchema>;
export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;
export type FeedbackBookingParams = z.infer<typeof FeedbackBookingParamsSchema>;
export type FeedbackPropertyParams = z.infer<typeof FeedbackPropertyParamsSchema>;
export type FeedbackAnalysis = z.infer<typeof FeedbackAnalysisSchema>;
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;
export type SummaryResult = z.infer<typeof SummaryResultSchema>;
export type AspectsResult = z.infer<typeof AspectsResultSchema>;
export type FeedbackSentiment = z.infer<typeof FeedbackSentimentEnum>;
export type FeedbackAggregation = z.infer<typeof FeedbackAggregationSchema>;
export type ScoreDistribution = z.infer<typeof ScoreDistributionSchema>;
export type FeedbackPreviousWindow = z.infer<typeof FeedbackPreviousWindowSchema>;
export type FeedbackAggregationQuery = z.infer<typeof FeedbackAggregationQuerySchema>;
export type FeedbackSortField = (typeof FEEDBACK_SORT_FIELDS)[number];
export type FeedbackOverTimeEntry = z.infer<typeof FeedbackOverTimeEntrySchema>;
export type TopicWithSentiment = z.infer<typeof TopicWithSentimentSchema>;
export type EligibleBooking = z.infer<typeof EligibleBookingSchema>;
export type EligibleFeedbackResponse = z.infer<typeof EligibleFeedbackResponseSchema>;
