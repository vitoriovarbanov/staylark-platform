import { db } from '../../../config/database.js';
import { Prisma, type FeedbackSentiment } from '@prisma/client';
import type { FeedbackSortField } from '@staylark/contract';
import { buildOrderBy } from '../../../utils/list-order.js';

const FEEDBACK_SORT: Record<
    FeedbackSortField,
    (dir: 'asc' | 'desc') => Prisma.FeedbackOrderByWithRelationInput | Prisma.FeedbackOrderByWithRelationInput[]
> = {
    createdAt: dir => ({ createdAt: dir })
};

// Preserves today's behavior when no sort is requested.
const FEEDBACK_SORT_FALLBACK: Prisma.FeedbackOrderByWithRelationInput[] = [{ createdAt: 'desc' }];

function serialize(feedback: {
    id: string;
    userId: string;
    propertyId: string;
    bookingId: string;
    audioUrl: string | null;
    transcription: string | null;
    sentiment: FeedbackSentiment | null;
    topics: unknown;
    score: number | null;
    summary: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: feedback.id,
        userId: feedback.userId,
        propertyId: feedback.propertyId,
        bookingId: feedback.bookingId,
        audioUrl: feedback.audioUrl,
        transcription: feedback.transcription,
        sentiment: feedback.sentiment,
        topics: (feedback.topics as string[]) ?? null,
        score: feedback.score,
        summary: feedback.summary,
        createdAt: feedback.createdAt.toISOString(),
        updatedAt: feedback.updatedAt.toISOString()
    };
}

/**
 * Summary stats for one window, used to render period-over-period deltas.
 * Feedback metrics are scoped by createdAt; responseRate is scoped by the
 * booking's checkOut date (the natural denominator is "stays completed in the window").
 */
async function summarizeWindow(
    propertyId: string,
    createdAtFilter: { gte?: Date; lte?: Date },
    checkOutFilter: { gte?: Date; lte?: Date }
): Promise<{ totalCount: number; averageScore: number; negativeRate: number; responseRate: number | null }> {
    const fbWhere = {
        propertyId,
        deletedAt: null,
        ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter })
    };
    const bookingWhere = {
        propertyId,
        deletedAt: null,
        status: 'COMPLETED' as const,
        ...(Object.keys(checkOutFilter).length > 0 && { checkOut: checkOutFilter })
    };

    const [totalCount, avgResult, negativeCount, completedBookings, bookingsWithFeedback] = await Promise.all([
        db.feedback.count({ where: { ...fbWhere, sentiment: { not: null } } }),
        db.feedback.aggregate({ where: { ...fbWhere, score: { not: null } }, _avg: { score: true } }),
        db.feedback.count({ where: { ...fbWhere, sentiment: 'NEGATIVE' } }),
        db.booking.count({ where: bookingWhere }),
        db.booking.count({ where: { ...bookingWhere, feedback: { some: { deletedAt: null } } } })
    ]);

    return {
        totalCount,
        averageScore: avgResult._avg.score ? Number(avgResult._avg.score.toFixed(1)) : 0,
        negativeRate: totalCount > 0 ? negativeCount / totalCount : 0,
        responseRate: completedBookings > 0 ? bookingsWithFeedback / completedBookings : null
    };
}

export const feedbackRepository = {
    create: async (data: {
        userId: string;
        propertyId: string;
        bookingId: string;
        audioUrl: string | null;
        transcription: string | null;
        sentiment: FeedbackSentiment | null;
        topics: string[] | null;
        score: number | null;
        summary: string | null;
    }) => {
        const { topics, ...rest } = data;
        const feedback = await db.feedback.create({
            data: { ...rest, topics: topics ?? Prisma.JsonNull }
        });
        return serialize(feedback);
    },

    /** All feedback with a transcript, for the aspect-tagging backfill. */
    findAllForTopics: async () => {
        const rows = await db.feedback.findMany({
            where: { deletedAt: null, transcription: { not: null } },
            select: { id: true, transcription: true }
        });
        return rows.map(r => ({ id: r.id, text: r.transcription as string }));
    },

    /** Store the review's aspect tags (or clear them when empty). */
    setTopics: async (id: string, topics: string[] | null) => {
        await db.feedback.update({
            where: { id },
            data: { topics: topics && topics.length > 0 ? topics : Prisma.JsonNull }
        });
    },

    /** Rows that failed classification (transcript present, sentiment null). */
    findUnclassified: async () => {
        const rows = await db.feedback.findMany({
            where: { deletedAt: null, transcription: { not: null }, sentiment: null },
            select: { id: true, transcription: true }
        });
        return rows.map(r => ({ id: r.id, text: r.transcription as string }));
    },

    setClassification: async (id: string, sentiment: FeedbackSentiment, score: number) => {
        await db.feedback.update({ where: { id }, data: { sentiment, score } });
    },

    findByBookingId: async (bookingId: string) => {
        const feedback = await db.feedback.findFirst({
            where: { bookingId, deletedAt: null }
        });
        return feedback ? serialize(feedback) : null;
    },

    findEligibleBookings: async (userId: string) => {
        const bookings = await db.booking.findMany({
            where: {
                userId,
                status: 'COMPLETED',
                deletedAt: null,
                feedback: {
                    none: {}
                }
            },
            include: {
                property: {
                    select: { id: true, title: true, city: true }
                }
            },
            orderBy: { checkOut: 'asc' }
        });

        return bookings.map(b => ({
            bookingId: b.id,
            propertyId: b.property.id,
            propertyName: b.property.title,
            propertyCity: b.property.city,
            checkOutDate: b.checkOut.toISOString().split('T')[0]
        }));
    },

    aggregateByPropertyId: async (
        propertyId: string,
        startDate?: string,
        endDate?: string,
        page = 1,
        limit = 10,
        sortBy?: FeedbackSortField,
        sortOrder: 'asc' | 'desc' = 'desc'
    ) => {
        const startDateObj = startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined;
        const endDateObj = endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined;

        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (startDateObj) dateFilter.gte = startDateObj;
        if (endDateObj) dateFilter.lte = endDateObj;

        const where = {
            propertyId,
            deletedAt: null,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        };

        const startFragment = startDateObj ? Prisma.sql`AND "createdAt" >= ${startDateObj}` : Prisma.empty;
        const endFragment = endDateObj ? Prisma.sql`AND "createdAt" <= ${endDateObj}` : Prisma.empty;
        const startFragmentF = startDateObj ? Prisma.sql`AND f."createdAt" >= ${startDateObj}` : Prisma.empty;
        const endFragmentF = endDateObj ? Prisma.sql`AND f."createdAt" <= ${endDateObj}` : Prisma.empty;

        // Response rate denominator is anchored on booking checkOut, not feedback createdAt.
        const checkOutFilter: { gte?: Date; lte?: Date } = {};
        if (startDateObj) checkOutFilter.gte = startDateObj;
        if (endDateObj) checkOutFilter.lte = endDateObj;

        // Previous equal-length window (only when a concrete range is selected).
        let previousCreatedAt: { gte?: Date; lte?: Date } | null = null;
        let previousCheckOut: { gte?: Date; lte?: Date } | null = null;
        if (startDateObj && endDateObj) {
            const lengthMs = endDateObj.getTime() - startDateObj.getTime();
            const prevEnd = new Date(startDateObj.getTime() - 1);
            const prevStart = new Date(startDateObj.getTime() - lengthMs - 1);
            previousCreatedAt = { gte: prevStart, lte: prevEnd };
            previousCheckOut = { gte: prevStart, lte: prevEnd };
        }

        // Resolve the previous-window summary in the same wave as the main queries (it is
        // independent of them), rather than awaiting it sequentially afterwards.
        const previousPromise =
            previousCreatedAt && previousCheckOut
                ? summarizeWindow(propertyId, previousCreatedAt, previousCheckOut)
                : Promise.resolve(null);

        const skip = (page - 1) * limit;

        const [
            feedbacks,
            feedbackCount,
            avgResult,
            sentimentCounts,
            allWithTopicsAndSentiment,
            timeGroups,
            scoreGroups,
            voiceCount,
            textCount,
            completedBookings,
            bookingsWithFeedback,
            needsAttentionRows,
            daysResult,
            previous
        ] = await Promise.all([
            db.feedback.findMany({
                where: { ...where, sentiment: { not: null } },
                orderBy: buildOrderBy(sortBy, sortOrder, FEEDBACK_SORT, FEEDBACK_SORT_FALLBACK),
                skip,
                take: limit
            }),
            db.feedback.count({
                where: { ...where, sentiment: { not: null } }
            }),
            db.feedback.aggregate({
                where: { ...where, score: { not: null } },
                _avg: { score: true },
                _count: true
            }),
            db.feedback.groupBy({
                by: ['sentiment'],
                where: { ...where, sentiment: { not: null } },
                _count: true
            }),
            db.feedback.findMany({
                where,
                select: { topics: true, sentiment: true }
            }),
            db.$queryRaw<
                Array<{
                    period: Date;
                    count: number;
                    positive: number;
                    neutral: number;
                    negative: number;
                    avg_score: number | null;
                }>
            >`
                SELECT date_trunc('week', "createdAt") as period,
                       COUNT(*)::int as count,
                       COUNT(*) FILTER (WHERE "sentiment" = 'POSITIVE')::int as positive,
                       COUNT(*) FILTER (WHERE "sentiment" = 'NEUTRAL')::int as neutral,
                       COUNT(*) FILTER (WHERE "sentiment" = 'NEGATIVE')::int as negative,
                       ROUND(AVG(score)::numeric, 1)::float as avg_score
                FROM "Feedback"
                WHERE "propertyId" = ${propertyId}
                  AND "deletedAt" IS NULL
                  AND "score" IS NOT NULL
                  ${startFragment}
                  ${endFragment}
                GROUP BY date_trunc('week', "createdAt")
                ORDER BY period ASC
            `,
            // 7. Score distribution
            db.feedback.groupBy({
                by: ['score'],
                where: { ...where, score: { not: null } },
                _count: true
            }),
            // 8. Voice count (has audioUrl)
            db.feedback.count({ where: { ...where, sentiment: { not: null }, audioUrl: { not: null } } }),
            // 9. Text count (no audioUrl)
            db.feedback.count({ where: { ...where, sentiment: { not: null }, audioUrl: null } }),
            // 10. Completed bookings in the checkOut window (response-rate denominator)
            db.booking.count({
                where: {
                    propertyId,
                    deletedAt: null,
                    status: 'COMPLETED',
                    ...(Object.keys(checkOutFilter).length > 0 && { checkOut: checkOutFilter })
                }
            }),
            // 11. ...of those, how many have feedback (response-rate numerator)
            db.booking.count({
                where: {
                    propertyId,
                    deletedAt: null,
                    status: 'COMPLETED',
                    feedback: { some: { deletedAt: null } },
                    ...(Object.keys(checkOutFilter).length > 0 && { checkOut: checkOutFilter })
                }
            }),
            // 12. Needs-attention: negative OR low-score, worst & newest first
            db.feedback.findMany({
                where: { ...where, OR: [{ sentiment: 'NEGATIVE' }, { score: { lte: 2 } }] },
                orderBy: [{ score: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
                take: 5
            }),
            // 13. Avg days from checkout to feedback (date - date = int days in Postgres).
            // Only count feedback left on/after checkout — "days to feedback" is undefined for
            // feedback submitted mid-stay (e.g. on an ACTIVE booking), which would otherwise
            // drag the average negative.
            db.$queryRaw<Array<{ avg_days: number | null }>>`
                SELECT AVG(f."createdAt"::date - b."checkOut")::float as avg_days
                FROM "Feedback" f
                JOIN "Booking" b ON f."bookingId" = b.id
                WHERE f."propertyId" = ${propertyId}
                  AND f."deletedAt" IS NULL
                  AND f."sentiment" IS NOT NULL
                  AND f."createdAt"::date >= b."checkOut"
                  ${startFragmentF}
                  ${endFragmentF}
            `,
            previousPromise
        ]);

        const sentimentBreakdown = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
        for (const row of sentimentCounts) {
            if (row.sentiment) {
                sentimentBreakdown[row.sentiment] = row._count;
            }
        }

        const topicSentiments = new Map<string, { POSITIVE: number; NEUTRAL: number; NEGATIVE: number }>();
        for (const f of allWithTopicsAndSentiment) {
            const topics = f.topics as string[] | null;
            const sentiment = f.sentiment;
            if (topics && sentiment) {
                for (const topic of topics) {
                    if (!topicSentiments.has(topic)) {
                        topicSentiments.set(topic, { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 });
                    }
                    topicSentiments.get(topic)![sentiment]++;
                }
            }
        }

        const topTopics = [...topicSentiments.entries()]
            .map(([topic, sentiments]) => {
                const total = sentiments.POSITIVE + sentiments.NEUTRAL + sentiments.NEGATIVE;
                const dominant = (Object.entries(sentiments) as Array<[FeedbackSentiment, number]>).sort(
                    (a, b) => b[1] - a[1]
                )[0][0];
                return { topic, count: total, dominantSentiment: dominant };
            })
            .sort((a, b) => b.count - a.count);

        const scoreDistribution: Record<'1' | '2' | '3' | '4' | '5', number> = {
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0
        };
        for (const row of scoreGroups) {
            if (row.score && row.score >= 1 && row.score <= 5) {
                scoreDistribution[String(row.score) as '1' | '2' | '3' | '4' | '5'] = row._count;
            }
        }

        const responseRate = completedBookings > 0 ? bookingsWithFeedback / completedBookings : null;
        const negativeRate = feedbackCount > 0 ? sentimentBreakdown.NEGATIVE / feedbackCount : 0;
        const avgDaysToFeedback = daysResult[0]?.avg_days ?? null;

        return {
            totalCount: feedbackCount,
            averageScore: avgResult._avg.score ? Number(avgResult._avg.score.toFixed(1)) : 0,
            sentimentBreakdown,
            topTopics,
            feedbackOverTime: timeGroups.map(row => ({
                period: row.period.toISOString().split('T')[0],
                count: Number(row.count),
                averageScore: row.avg_score ?? 0,
                positive: Number(row.positive),
                neutral: Number(row.neutral),
                negative: Number(row.negative)
            })),
            feedbacks: feedbacks.map(serialize),
            totalPages: Math.ceil(feedbackCount / limit) || 1,
            // --- metrics-expansion additions ---
            responseRate,
            completedBookings,
            negativeRate,
            voiceCount,
            textCount,
            avgDaysToFeedback,
            scoreDistribution,
            needsAttention: needsAttentionRows.map(serialize),
            previous
        };
    }
};
