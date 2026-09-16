import type { Request, Response, NextFunction } from 'express';
import type { FeedbackAggregationQuery } from '@staylark/contract';
import { feedbackService } from './service/feedback.service.js';
import { feedbackBackfillService } from './service/feedback-backfill.service.js';
import { AppError } from '../../utils/errors.js';

/** Wraps async route handler — forwards thrown errors to Express error middleware */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const feedbackController = {
    submit: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const { propertyId, bookingId, text } = req.body;

        // Require either audio file or text
        if (!req.file && !text) {
            throw new AppError('Either an audio file or text feedback is required', 400);
        }

        const feedback = await feedbackService.submit(userId, propertyId, bookingId, {
            audioBuffer: req.file?.buffer,
            mimeType: req.file?.mimetype,
            text
        });

        res.status(201).json({ data: feedback });
    }),

    getEligible: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const eligibleBookings = await feedbackService.getEligibleBookings(userId);
        res.json({ eligibleBookings });
    }),

    getByBookingId: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const bookingId = req.params.bookingId as string;

        const feedback = await feedbackService.getByBookingId(userId, userRole, bookingId);
        res.json({ data: feedback });
    }),

    getPropertyAggregation: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const propertyId = req.params.propertyId as string;
        const { startDate, endDate, page, limit, sortBy, sortOrder } = req.query as unknown as FeedbackAggregationQuery;

        const aggregation = await feedbackService.getPropertyAggregation(
            userId,
            userRole,
            propertyId,
            startDate,
            endDate,
            page,
            limit,
            sortBy,
            sortOrder
        );
        res.json({ data: aggregation });
    }),

    backfill: asyncHandler(async (_req, res) => {
        const classification = await feedbackBackfillService.backfillClassification();
        const topics = await feedbackBackfillService.backfillTopics();
        res.json({ data: { ...classification, ...topics } });
    })
};
