import type { FeedbackSortField } from '@staylark/contract';
import type { FeedbackSentiment } from '@prisma/client';
import { inferenceClient, isInferenceMocked } from '../../../utils/inference.js';
import { feedbackRepository } from '../repository/feedback.repository.js';
import { uploadService } from '../../upload/service/upload.service.js';
import { db } from '../../../config/database.js';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';

/**
 * Store the original feedback audio in Cloudinary. Best-effort: storage is a playback
 * convenience, so a failure here must never cost the actual feedback. Logs and returns
 * null on any error, leaving the feedback to save without an audioUrl.
 */
async function tryUploadAudio(buffer: Buffer, bookingId: string): Promise<string | null> {
    try {
        return await uploadService.uploadAudio(buffer);
    } catch (err) {
        logger.error({ err, bookingId }, 'Feedback audio upload failed; continuing without audioUrl');
        return null;
    }
}

type MockResponse = {
    transcription: string;
    analysis: { sentiment: FeedbackSentiment; topics: string[]; score: number; summary: string };
};

const MOCK_RESPONSES: MockResponse[] = [
    {
        transcription:
            'The apartment was very clean and well located. The WiFi was a bit slow but overall a great experience.',
        analysis: {
            sentiment: 'POSITIVE',
            topics: ['cleanliness', 'location', 'internet'],
            score: 4,
            summary:
                'Guest had a positive experience, highlighting cleanliness and location. Minor complaint about WiFi speed.'
        }
    },
    {
        transcription:
            'Absolutely loved the mountain view from the balcony. The spa was incredible and the staff were so friendly. Breakfast could have been better though.',
        analysis: {
            sentiment: 'POSITIVE',
            topics: ['comfort', 'amenities', 'service', 'food'],
            score: 5,
            summary: 'Exceptional stay with stunning views and excellent spa. Only minor note about breakfast quality.'
        }
    },
    {
        transcription:
            'The location was convenient but the street noise at night made it hard to sleep. The kitchen was well equipped which was a plus. Parking was also a nightmare.',
        analysis: {
            sentiment: 'NEUTRAL',
            topics: ['location', 'noise', 'amenities', 'parking'],
            score: 3,
            summary:
                'Mixed experience — good location and kitchen facilities offset by significant street noise and parking difficulties.'
        }
    },
    {
        transcription:
            'Honestly quite disappointed. The photos looked nothing like the actual place. It was dirty when we arrived and the air conditioning did not work. Took two days to get it fixed.',
        analysis: {
            sentiment: 'NEGATIVE',
            topics: ['cleanliness', 'maintenance', 'comfort'],
            score: 1,
            summary:
                'Poor experience due to misleading photos, cleanliness issues on arrival, and broken air conditioning with slow repair response.'
        }
    },
    {
        transcription:
            'Great seaside location, we could walk to the beach in two minutes. The garden was lovely for evening barbecues. Would have appreciated faster check-in though.',
        analysis: {
            sentiment: 'POSITIVE',
            topics: ['location', 'amenities', 'check_in'],
            score: 4,
            summary:
                'Very enjoyable beach-adjacent stay with excellent outdoor space. Minor friction with check-in process.'
        }
    },
    {
        transcription:
            'The apartment was okay, nothing special. It was clean enough and the bed was comfortable. The neighborhood felt a bit unsafe at night which was concerning.',
        analysis: {
            sentiment: 'NEUTRAL',
            topics: ['cleanliness', 'comfort', 'safety'],
            score: 3,
            summary:
                'Adequate stay with acceptable cleanliness and comfort. Safety concerns about the neighborhood at night.'
        }
    },
    {
        transcription:
            'Perfect for our ski trip. The storage room for equipment was super handy. The heating worked great even in minus fifteen. Only thing is the internet was too slow for video calls.',
        analysis: {
            sentiment: 'POSITIVE',
            topics: ['amenities', 'comfort', 'internet'],
            score: 4,
            summary:
                'Ideal ski accommodation with excellent heating and equipment storage. Internet speed insufficient for remote work.'
        }
    },
    {
        transcription:
            'We had a terrible experience. The hot water stopped working on day two and the landlord was unreachable. The price was way too high for what we got.',
        analysis: {
            sentiment: 'NEGATIVE',
            topics: ['maintenance', 'service', 'price'],
            score: 1,
            summary:
                'Very poor experience with broken hot water, unresponsive management, and pricing that did not match the quality.'
        }
    },
    {
        transcription:
            'The old town charm was exactly what we were looking for. Lovely architecture and the apartment had a lot of character. A bit noisy from the restaurants below but we did not mind much.',
        analysis: {
            sentiment: 'POSITIVE',
            topics: ['location', 'comfort', 'noise'],
            score: 5,
            summary:
                'Charming old town apartment with great character and location. Minor restaurant noise was not a significant issue.'
        }
    },
    {
        transcription:
            'It was fine for one night but I would not stay longer. The mattress was uncomfortable and the shower pressure was weak. At least the check-in was smooth.',
        analysis: {
            sentiment: 'NEUTRAL',
            topics: ['comfort', 'maintenance', 'check_in'],
            score: 2,
            summary:
                'Passable for a short stay but comfort issues with mattress and shower. Smooth check-in was a positive note.'
        }
    }
];

let mockIndex = 0;

function getNextMockResponse() {
    const response = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
    mockIndex++;
    return response;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Seed Whisper's vocabulary with the property's location so local proper nouns
 * (city, neighbourhood, street names) transcribe correctly instead of being
 * guessed phonetically (e.g. "Plovdiv" rather than "Plottooth's").
 */
function buildTranscriptionPrompt(city: string, address: string): string {
    return `Guest review of a property in ${city}. ${address}.`.trim();
}

/** Minimum words for an audio transcript to count as real spoken feedback (vs noise). */
const MIN_TRANSCRIPT_WORDS = 3;

/** Heuristic guard against empty/noise transcriptions and short hallucinations. */
function hasIntelligibleSpeech(text: string): boolean {
    return text.trim().split(/\s+/).filter(Boolean).length >= MIN_TRANSCRIPT_WORDS;
}

async function transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    mockResponse?: MockResponse,
    prompt?: string
): Promise<string | null> {
    if (isInferenceMocked && mockResponse) {
        await delay(800);
        return mockResponse.transcription;
    }

    const ext = mimeType.split('/')[1] ?? 'webm';
    try {
        return await inferenceClient.transcribe(audioBuffer, mimeType, `feedback.${ext}`, prompt);
    } catch (err) {
        logger.error({ err }, 'Transcription failed; saving feedback without transcript');
        return null;
    }
}

/** Sentiment + score. Returns nulls on failure so submission still succeeds. */
async function classify(
    transcription: string,
    mockResponse?: MockResponse
): Promise<{ sentiment: FeedbackSentiment | null; score: number | null }> {
    if (isInferenceMocked && mockResponse) {
        await delay(400);
        return { sentiment: mockResponse.analysis.sentiment, score: mockResponse.analysis.score };
    }
    try {
        const r = await inferenceClient.classify(transcription);
        return { sentiment: r.sentiment as FeedbackSentiment, score: r.score };
    } catch (err) {
        logger.error({ err }, 'Classification failed; saving feedback without sentiment/score');
        return { sentiment: null, score: null };
    }
}

/** Extractive summary (length-gated server-side). Null on failure or short text. */
async function summarize(transcription: string, mockResponse?: MockResponse): Promise<string | null> {
    if (isInferenceMocked && mockResponse) return mockResponse.analysis.summary;
    try {
        return await inferenceClient.summarize(transcription);
    } catch (err) {
        logger.error({ err }, 'Summary failed; saving feedback without summary');
        return null;
    }
}

/**
 * Relevance gate — is this transcript actually feedback about the stay, vs off-topic
 * rambling / someone testing the system? Degrades OPEN: a mock or a relevance-service
 * outage allows the submission rather than blocking a genuine guest.
 */
async function isRelevantFeedback(transcription: string, mockResponse?: MockResponse): Promise<boolean> {
    if (isInferenceMocked && mockResponse) return true;
    try {
        const r = await inferenceClient.relevance(transcription);
        return r.isReview;
    } catch (err) {
        logger.error({ err }, 'Relevance check failed; allowing submission');
        return true;
    }
}

/**
 * Aspect tags (cleanliness, location, noise, …) for the review — multilingual embedding
 * similarity against a fixed taxonomy, so topics are meaningful per-review instead of
 * mined from the corpus. Returns null on failure or when nothing clears the threshold —
 * submission still succeeds, just without topic chips.
 */
async function tagAspects(transcription: string, mockResponse?: MockResponse): Promise<string[] | null> {
    if (isInferenceMocked && mockResponse) return mockResponse.analysis.topics;
    try {
        const { topics } = await inferenceClient.tagAspects(transcription);
        return topics.length > 0 ? topics : null;
    } catch (err) {
        logger.error({ err }, 'Aspect tagging failed; saving feedback without topics');
        return null;
    }
}

export const feedbackService = {
    /**
     * Submit voice feedback for a booking.
     * Transcribes audio → relevance-gates, classifies, summarises + tags aspects via the
     * inference service → persists result. Topics are tagged synchronously here (zero-shot),
     * so a submission lands with its topic chips already attached.
     */
    submit: async (
        userId: string,
        propertyId: string,
        bookingId: string,
        input: { audioBuffer?: Buffer; mimeType?: string; text?: string }
    ) => {
        // 1. Verify booking exists, belongs to user, and is ACTIVE or COMPLETED
        const booking = await db.booking.findFirst({
            where: { id: bookingId, deletedAt: null }
        });

        if (!booking) {
            throw new NotFoundError('Booking not found');
        }

        if (booking.userId !== userId) {
            throw new ForbiddenError('You can only leave feedback for your own bookings');
        }

        if (booking.propertyId !== propertyId) {
            throw new ForbiddenError('Booking does not belong to the specified property');
        }

        if (!['ACTIVE', 'COMPLETED'].includes(booking.status)) {
            throw new ForbiddenError('Feedback can only be submitted for active or completed bookings');
        }

        // 2. Check for existing feedback on this booking
        const existing = await feedbackRepository.findByBookingId(bookingId);
        if (existing) {
            throw new ConflictError('Feedback already submitted for this booking');
        }

        // Pick a mock response upfront so transcription + analysis are consistent
        const mockResponse = isInferenceMocked ? getNextMockResponse() : undefined;

        let transcription: string;
        let audioBuffer: Buffer | null = null;

        if (input.audioBuffer && input.mimeType) {
            // Audio path: transcribe with Whisper. We deliberately do NOT upload the clip
            // yet — a recording that fails the quality/relevance gates below is rejected,
            // and uploading up-front would orphan the file in Cloudinary (audio uploads
            // return only a URL, with no public id we can later delete).
            logger.info({ bookingId, mocked: isInferenceMocked }, 'Transcribing audio');

            // Bias Whisper toward this property's local proper nouns (city, street,
            // neighbourhood) so they transcribe correctly.
            const property = await db.property.findUnique({
                where: { id: propertyId },
                select: { city: true, address: true }
            });
            const prompt = property ? buildTranscriptionPrompt(property.city, property.address) : undefined;

            const transcribed = await transcribeAudio(input.audioBuffer, input.mimeType, mockResponse, prompt);

            // A null transcript means the transcription *service* failed. Surface a
            // retryable error instead of persisting an analysis-less row: the
            // one-feedback-per-booking guard would otherwise permanently lock the user
            // out of ever leaving real feedback for this booking.
            if (transcribed === null) {
                throw new AppError("We couldn't process your recording right now. Please try again in a moment.", 503);
            }

            // Reject non-speech / unintelligible recordings (silence, background noise,
            // or a hallucinated prompt echo) so we never save a bogus AI "review".
            if (!hasIntelligibleSpeech(transcribed)) {
                throw new AppError(
                    "We couldn't make out any speech in your recording. Please re-record and speak clearly, or type your feedback instead.",
                    422
                );
            }

            transcription = transcribed;
            audioBuffer = input.audioBuffer;
        } else {
            // Text path: use text directly
            transcription = input.text!;
            logger.info({ bookingId }, 'Using text feedback directly');
        }

        // 4. Relevance gate FIRST. An off-topic submission (real speech, but not about
        //    the stay) is rejected here — before we upload the audio or run the rest of
        //    the analysis — so a rejected submission leaves nothing behind (no orphaned
        //    Cloudinary clip, no wasted classify/summarise/tag work). Degrades open: a
        //    relevance-service outage allows the submission rather than blocking a guest.
        logger.info({ bookingId, mocked: isInferenceMocked }, 'Checking relevance');
        const relevant = await isRelevantFeedback(transcription, mockResponse);
        if (!relevant) {
            throw new AppError(
                "That didn't sound like feedback about your stay. Tell us what you liked or what could be better about the property, and we'll do the rest.",
                422
            );
        }

        // 5. Content passed every gate → upload the recording (if any) and run the
        //    remaining analysis concurrently. All best-effort: a failure leaves that
        //    field null but never blocks the submission (the transcript is the value).
        logger.info({ bookingId, mocked: isInferenceMocked }, 'Classifying + summarising + tagging aspects');
        const [audioUrl, cls, sum, tags] = await Promise.all([
            audioBuffer ? tryUploadAudio(audioBuffer, bookingId) : Promise.resolve(null),
            classify(transcription, mockResponse),
            summarize(transcription, mockResponse),
            tagAspects(transcription, mockResponse)
        ]);

        // 6. Persist (topics tagged synchronously above)
        const feedback = await feedbackRepository.create({
            userId,
            propertyId,
            bookingId,
            audioUrl,
            transcription,
            sentiment: cls.sentiment,
            topics: tags,
            score: cls.score,
            summary: sum
        });

        logger.info({ feedbackId: feedback.id, bookingId }, 'Feedback submitted successfully');
        return feedback;
    },

    /** Get COMPLETED bookings without feedback for the authenticated user */
    getEligibleBookings: async (userId: string) => {
        return feedbackRepository.findEligibleBookings(userId);
    },

    /** Get feedback for a specific booking. Everyone can only see their own — admins included. */
    getByBookingId: async (userId: string, userRole: string, bookingId: string) => {
        const booking = await db.booking.findFirst({
            where: { id: bookingId, deletedAt: null }
        });

        if (!booking) {
            throw new NotFoundError('Booking not found');
        }

        if (booking.userId !== userId) {
            throw new ForbiddenError('You can only view feedback for your own bookings');
        }

        const feedback = await feedbackRepository.findByBookingId(bookingId);
        if (!feedback) {
            throw new NotFoundError('No feedback found for this booking');
        }

        return feedback;
    },

    /**
     * Staff: get aggregated feedback for a property (optionally filtered by date range).
     * ADMIN may view any property; MANAGER is scoped to properties they manage.
     */
    getPropertyAggregation: async (
        userId: string,
        userRole: string,
        propertyId: string,
        startDate?: string,
        endDate?: string,
        page?: number,
        limit?: number,
        sortBy?: FeedbackSortField,
        sortOrder?: 'asc' | 'desc'
    ) => {
        const property = await db.property.findFirst({
            where: { id: propertyId, deletedAt: null }
        });

        if (!property) {
            throw new NotFoundError('Property not found');
        }

        if (userRole === 'MANAGER' && property.managerId !== userId) {
            throw new ForbiddenError('You can only view feedback for properties you manage');
        }

        // Topics are tagged synchronously at submission, so the aggregation already
        // reflects the latest data — no background refit / polling needed.
        return feedbackRepository.aggregateByPropertyId(propertyId, startDate, endDate, page, limit, sortBy, sortOrder);
    }
};
