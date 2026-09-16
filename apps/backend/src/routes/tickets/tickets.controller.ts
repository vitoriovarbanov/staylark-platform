import type { Request, Response, NextFunction } from 'express';
import type { TicketQuery, TicketStatus, TicketReplyLanguage } from '@staylark/contract';
import { ticketsService } from './service/tickets.service.js';
import { AppError } from '../../utils/errors.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const ticketsController = {
    create: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const { propertyId, bookingId, text } = req.body as {
            propertyId: string;
            bookingId: string;
            text?: string;
        };

        // Exactly one of audio | text must be supplied
        if (!req.file && !text) {
            throw new AppError('Either an audio recording or text description is required', 400);
        }
        if (req.file && text) {
            throw new AppError('Provide either audio or text, not both', 400);
        }

        const ticket = await ticketsService.create(userId, {
            propertyId,
            bookingId,
            audioBuffer: req.file?.buffer,
            mimeType: req.file?.mimetype,
            text
        });

        res.status(201).json({ data: ticket });
    }),

    list: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const role = req.user!.role;
        const query = req.query as unknown as TicketQuery;

        const result = await ticketsService.list(userId, role, query);
        res.json({ data: result });
    }),

    getById: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const role = req.user!.role;
        const ticketId = req.params.id as string;

        const ticket = await ticketsService.getById(userId, role, ticketId);
        res.json({ data: ticket });
    }),

    updateStatus: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const role = req.user!.role;
        const ticketId = req.params.id as string;
        const { status } = req.body as { status: TicketStatus };

        const ticket = await ticketsService.updateStatus(userId, role, ticketId, status);
        res.json({ data: ticket });
    }),

    withdraw: asyncHandler(async (req, res) => {
        const userId = req.user!.id;
        const ticketId = req.params.id as string;
        const ticket = await ticketsService.withdraw(userId, ticketId);
        res.json({ data: ticket });
    }),

    reassign: asyncHandler(async (req, res) => {
        const ticketId = req.params.id as string;
        const { assignedToId } = req.body as { assignedToId: string | null };
        const ticket = await ticketsService.reassign(ticketId, assignedToId, req.user!.id);
        res.json({ data: ticket });
    }),

    listMessages: asyncHandler(async (req, res) => {
        const messages = await ticketsService.getMessages(req.user!.id, req.user!.role, req.params.id as string);
        res.json({ data: messages });
    }),

    addMessage: asyncHandler(async (req, res) => {
        const { body } = req.body as { body: string };
        const message = await ticketsService.addMessage(req.user!.id, req.user!.role, req.params.id as string, body);
        res.status(201).json({ data: message });
    }),

    markSeen: asyncHandler(async (req, res) => {
        await ticketsService.markSeen(req.user!.id, req.params.id as string);
        res.status(204).end();
    }),

    unreadCount: asyncHandler(async (req, res) => {
        const count = await ticketsService.getUnreadCount(req.user!.id);
        res.json({ data: { count } });
    }),

    suggestReply: asyncHandler(async (req, res) => {
        const { language } = req.body as { language?: TicketReplyLanguage };
        const suggestion = await ticketsService.suggestReply(
            req.user!.id,
            req.user!.role,
            req.params.id as string,
            language
        );
        res.json({ data: { suggestion } });
    })
};
