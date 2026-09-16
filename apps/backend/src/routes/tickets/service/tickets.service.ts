import {
    TicketClassificationSchema,
    type TicketClassification,
    type TicketCategory,
    type TicketStatus,
    type TicketQuery,
    type TicketReplyLanguage
} from '@staylark/contract';
import type { TicketPriority } from '@prisma/client';
import { openai, isOpenAIMocked } from '../../../utils/openai.js';
import { db } from '../../../config/database.js';
import { ticketsRepository } from '../repository/tickets.repository.js';
import { ticketRoutingRepository } from '../../ticket-routing/repository/ticket-routing.repository.js';
import {
    sendTicketAssignedEmail,
    sendTicketUserRepliedEmail,
    sendTicketStaffRepliedEmail
} from '../../../services/email/email.service.js';
import { buildTicketNotifications, buildUserReplyNotifications } from '../../../services/email/ticket-notifications.js';
import { chooseTicketAssignee } from './resolve-assignee.js';
import { emitTicketEvent } from '../../../realtime/realtime.js';
import { AppError, NotFoundError, ForbiddenError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import {
    SUGGEST_REPLY_SYSTEM_PROMPT,
    ReplySuggestionSchema,
    MOCK_REPLY_SUGGESTION,
    buildReplySuggestionPrompt
} from './reply-suggestion.js';

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    OPEN: ['IN_PROGRESS', 'DISMISSED'],
    IN_PROGRESS: ['RESOLVED', 'DISMISSED'],
    RESOLVED: ['IN_PROGRESS'],
    DISMISSED: ['IN_PROGRESS']
};

// --- Prompts ---

const CLASSIFICATION_SYSTEM_PROMPT = `You classify guest-reported problems at rental properties.
Return a JSON object with EXACTLY these fields:

- "category": one of "NOISE","DAMAGE","CLEANLINESS","DELIVERY","UTILITIES","EMERGENCY".
  Choose the single best match. Do not invent other values.
- "priority": one of "LOW","MEDIUM","HIGH","CRITICAL".
  CRITICAL = immediate safety/health risk (fire, flood, gas leak, no heat in winter).
  HIGH = unusable/broken core amenity (no water, no electricity, locked out).
  MEDIUM = inconvenient but the stay can continue.
  LOW = minor or cosmetic.
- "summary": 1-2 sentence objective summary (max 500 chars).

Return ONLY valid JSON. No prose.`;

// --- Mock data for USE_OPENAI_MOCK=true ---

type MockEntry = {
    transcription: string;
    // `classificationRaw` is what GPT would return — may be invalid (tests fallback).
    classificationRaw: Record<string, unknown>;
};

const MOCK_TICKET_RESPONSES: MockEntry[] = [
    {
        transcription: "The upstairs neighbours have been playing loud music since midnight. I can't sleep at all.",
        classificationRaw: {
            category: 'NOISE',
            priority: 'MEDIUM',
            summary: 'Guest cannot sleep due to loud music from upstairs neighbours late at night.'
        }
    },
    {
        transcription:
            "The bathroom sink is leaking badly and water is pooling on the floor. It looks like it's been going for hours.",
        classificationRaw: {
            category: 'DAMAGE',
            priority: 'HIGH',
            summary: 'Significant bathroom sink leak causing water to pool on the floor.'
        }
    },
    {
        transcription:
            "The apartment wasn't cleaned before we arrived — there's dirty dishes in the sink and hair on the pillows.",
        classificationRaw: {
            category: 'CLEANLINESS',
            priority: 'MEDIUM',
            summary: 'Apartment was not cleaned before arrival — dirty dishes and unwashed bedding.'
        }
    },
    {
        transcription:
            "My Amazon package was supposed to be dropped at reception but the delivery person left it on the street and now it's gone.",
        classificationRaw: {
            category: 'DELIVERY',
            priority: 'LOW',
            summary: 'Package left unsecured by delivery driver and subsequently lost.'
        }
    },
    {
        transcription: "There is no hot water in the shower and the heating is off. It's ten degrees outside.",
        classificationRaw: {
            category: 'UTILITIES',
            priority: 'HIGH',
            summary: 'No hot water and no heating during cold weather.'
        }
    },
    {
        transcription: "I smell gas in the kitchen — really strong. I've opened the windows and left the apartment.",
        classificationRaw: {
            category: 'EMERGENCY',
            priority: 'CRITICAL',
            summary: 'Strong gas smell reported in kitchen; guest has evacuated and opened windows.'
        }
    },
    {
        transcription: 'The wifi keeps dropping every ten minutes and I cannot work.',
        // Deliberately invalid category — exercises the fallback path.
        classificationRaw: {
            category: 'INTERNET',
            priority: 'MEDIUM',
            summary: 'Unreliable wifi disrupting remote work.'
        }
    }
];

let mockIndex = 0;
function getNextMockResponse(): MockEntry {
    const response = MOCK_TICKET_RESPONSES[mockIndex % MOCK_TICKET_RESPONSES.length]!;
    mockIndex++;
    return response;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Whisper transcription ---

async function transcribeAudio(audioBuffer: Buffer, mimeType: string, mockResponse?: MockEntry): Promise<string> {
    if (isOpenAIMocked && mockResponse) {
        await delay(1500);
        return mockResponse.transcription;
    }
    const ext = mimeType.split('/')[1] ?? 'webm';
    const file = new File([audioBuffer], `ticket.${ext}`, { type: mimeType });
    const result = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file
    });
    return result.text;
}

// --- GPT classification + fallback ---

type ClassificationResult = {
    classification: TicketClassification | null; // null when fallback triggers
    categoryRaw: string | null;
    needsReview: boolean;
};

async function classifyTranscription(transcription: string, mockResponse?: MockEntry): Promise<ClassificationResult> {
    let rawObject: Record<string, unknown>;

    if (isOpenAIMocked && mockResponse) {
        await delay(1500);
        rawObject = mockResponse.classificationRaw;
    } else {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
                { role: 'user', content: transcription }
            ]
        });
        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new AppError('GPT returned empty response', 502);
        rawObject = JSON.parse(raw) as Record<string, unknown>;
    }

    const categoryRaw = typeof rawObject.category === 'string' ? rawObject.category : null;

    const parsed = TicketClassificationSchema.safeParse(rawObject);
    if (!parsed.success) {
        logger.warn(
            { rawObject, zodErrors: parsed.error.errors },
            'GPT classification failed Zod validation — falling back to needsReview ticket'
        );
        return { classification: null, categoryRaw, needsReview: true };
    }
    return { classification: parsed.data, categoryRaw, needsReview: false };
}

// --- Helpers ---

async function isPropertyManagedBy(propertyId: string, userId: string): Promise<boolean> {
    const property = await db.property.findFirst({
        where: { id: propertyId, managerId: userId, deletedAt: null }
    });
    return property !== null;
}

/**
 * Resolves the assignee for a new ticket. I/O wrapper around the pure
 * chooseTicketAssignee decision; see resolve-assignee.ts for the precedence rules.
 *
 * Gathers the two ranking signals only when they can actually matter — i.e. when
 * the category has handlers and the property's manager isn't one of them. In the
 * common case (no routing configured, or the manager handles it) this costs one
 * extra query and no more.
 */
async function resolveAssignee(category: TicketCategory | null, propertyId: string): Promise<string | null> {
    const [handlerIds, property] = await Promise.all([
        category ? ticketRoutingRepository.userIdsForCategory(category) : Promise.resolve([]),
        db.property.findFirst({ where: { id: propertyId, deletedAt: null }, select: { managerId: true, city: true } })
    ]);

    const managerId = property?.managerId ?? null;
    if (handlerIds.length === 0 || (managerId && handlerIds.includes(managerId))) {
        return chooseTicketAssignee(category, managerId, []);
    }

    const [inCity, loads] = await Promise.all([
        // Handlers who manage at least one alive property in the ticket's city.
        property?.city
            ? db.property.findMany({
                  where: { city: property.city, deletedAt: null, managerId: { in: handlerIds } },
                  select: { managerId: true },
                  distinct: ['managerId']
              })
            : Promise.resolve([]),
        db.ticket.groupBy({
            by: ['assignedToId'],
            where: { assignedToId: { in: handlerIds }, deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            _count: { _all: true }
        })
    ]);

    const cityIds = new Set(inCity.map(p => p.managerId).filter((id): id is string => id !== null));
    const loadById = new Map(loads.map(l => [l.assignedToId, l._count._all]));

    return chooseTicketAssignee(
        category,
        managerId,
        handlerIds.map(id => ({
            id,
            managesInCity: cityIds.has(id),
            openTickets: loadById.get(id) ?? 0
        }))
    );
}

// --- Notifications ---

/** The live manager of a property, as an email recipient. Null for unassigned properties. */
async function getPropertyManagerRecipient(propertyId: string): Promise<{ email: string; name: string } | null> {
    const property = await db.property.findUnique({
        where: { id: propertyId },
        select: { manager: { select: { email: true, name: true, deletedAt: true } } }
    });
    const manager = property?.manager;
    if (!manager || manager.deletedAt) return null;
    return { email: manager.email, name: manager.name };
}

/**
 * Fire-and-forget notification for a ticket whose assignment state just changed.
 * Fetches recipients, builds the (pure) notification list, dispatches sends.
 * Never throws into the caller — emails must not fail ticket create/reassign.
 */
async function dispatchTicketNotifications(ticket: {
    id: string;
    propertyId: string;
    category: string | null;
    priority: string;
    summary: string | null;
    assignedToId: string | null;
}): Promise<void> {
    const property = await db.property.findUnique({
        where: { id: ticket.propertyId },
        select: { title: true }
    });
    const propertyTitle = property?.title ?? 'your property';

    const assignee = ticket.assignedToId
        ? await db.user.findUnique({ where: { id: ticket.assignedToId }, select: { email: true, name: true } })
        : null;

    for (const n of buildTicketNotifications(ticket, propertyTitle, assignee)) {
        sendTicketAssignedEmail({
            to: n.to,
            assigneeName: n.assigneeName,
            propertyTitle: n.propertyTitle,
            category: n.category,
            priority: n.priority,
            summary: n.summary,
            ticketId: n.ticketId
        });
    }
}

/** Fire-and-forget "guest replied" email — assignee if live, otherwise the property's manager. */
async function dispatchUserReplyNotifications(
    ticket: { id: string; propertyId: string; summary: string | null; assignedToId: string | null },
    messageBody: string
): Promise<void> {
    const [property, assignee] = await Promise.all([
        db.property.findUnique({ where: { id: ticket.propertyId }, select: { title: true } }),
        ticket.assignedToId
            ? db.user.findFirst({
                  where: { id: ticket.assignedToId, deletedAt: null },
                  select: { email: true, name: true }
              })
            : Promise.resolve(null)
    ]);

    const propertyManager = assignee ? null : await getPropertyManagerRecipient(ticket.propertyId);

    for (const n of buildUserReplyNotifications(
        ticket,
        property?.title ?? 'your property',
        assignee,
        propertyManager,
        messageBody
    )) {
        sendTicketUserRepliedEmail(n);
    }
}

/**
 * Fire-and-forget "we replied" email to the guest who reported the ticket.
 *
 * Needs no recipient-resolution counterpart to buildUserReplyNotifications: the
 * recipient is always the reporter, so there is nothing to route. Without this
 * the guest only learns of a reply via the realtime socket, which reaches
 * nobody if they are not currently in the app.
 */
async function dispatchStaffReplyNotifications(
    ticket: { id: string; propertyId: string; userId: string; summary: string | null },
    messageBody: string
): Promise<void> {
    const [property, reporter] = await Promise.all([
        db.property.findUnique({ where: { id: ticket.propertyId }, select: { title: true } }),
        db.user.findFirst({ where: { id: ticket.userId, deletedAt: null }, select: { email: true, name: true } })
    ]);

    // Reporter deleted their account between replying and now — nothing to send.
    if (!reporter) return;

    sendTicketStaffRepliedEmail({
        to: reporter.email,
        recipientName: reporter.name,
        propertyTitle: property?.title ?? 'your stay',
        summary: ticket.summary,
        messageBody,
        ticketId: ticket.id
    });
}

// --- Service ---

export const ticketsService = {
    create: async (
        userId: string,
        input: {
            propertyId: string;
            bookingId: string;
            audioBuffer?: Buffer;
            mimeType?: string;
            text?: string;
        }
    ) => {
        // 1. Validate booking ownership + property match + eligibility
        const booking = await db.booking.findFirst({
            where: { id: input.bookingId, deletedAt: null }
        });
        if (!booking) throw new NotFoundError('Booking not found');
        if (booking.userId !== userId) throw new ForbiddenError('You can only report problems for your own bookings');
        if (booking.propertyId !== input.propertyId)
            throw new ForbiddenError('Booking does not belong to the specified property');
        if (booking.status !== 'ACTIVE') throw new ForbiddenError('Tickets can only be opened on active bookings');

        // 2. Pick mock upfront so transcription + classification stay paired
        const mockResponse = isOpenAIMocked ? getNextMockResponse() : undefined;

        // 3. Transcription — Whisper for audio, direct passthrough for text
        let transcription: string;
        if (input.audioBuffer && input.mimeType) {
            logger.info({ bookingId: input.bookingId, mocked: isOpenAIMocked }, 'Transcribing ticket audio');
            transcription = await transcribeAudio(input.audioBuffer, input.mimeType, mockResponse);
        } else {
            logger.info({ bookingId: input.bookingId }, 'Using text ticket directly');
            transcription = input.text!;
        }

        // 4. Classify (+ fallback)
        logger.info({ bookingId: input.bookingId }, 'Classifying ticket transcription');
        const { classification, categoryRaw, needsReview } = await classifyTranscription(transcription, mockResponse);

        // 5. Resolve assignee: category routing first, property manager as the fallback
        const assignedToId = await resolveAssignee(classification?.category ?? null, input.propertyId);

        const priority: TicketPriority = classification?.priority ?? 'MEDIUM';

        // 6. Persist
        const ticket = await ticketsRepository.create({
            userId,
            propertyId: input.propertyId,
            bookingId: input.bookingId,
            transcription,
            category: classification?.category ?? null,
            categoryRaw,
            priority,
            assignedToId,
            summary: classification?.summary ?? null,
            needsReview,
            // The triage queue is retired: the property's manager is the guaranteed
            // fallback, so a ticket never needs admin assignment. Column retained for
            // legacy rows.
            needsAssignment: false
        });

        logger.info(
            { ticketId: ticket.id, category: ticket.category, priority, assignedToId, needsReview },
            'Ticket created'
        );

        // 7. Notify the assignee (fire-and-forget; never fails the request)
        void dispatchTicketNotifications(ticket).catch(err =>
            logger.error({ ticketId: ticket.id, err }, 'Ticket creation notification failed')
        );

        return ticket;
    },

    list: async (userId: string, role: string, query: TicketQuery) => {
        // Managers see their properties' tickets plus anything assigned to them.
        // Everyone else — USER and ADMIN alike — sees only tickets they reported.
        const scopedWhere =
            role === 'MANAGER' ? { OR: [{ property: { managerId: userId } }, { assignedToId: userId }] } : { userId };
        return ticketsRepository.list(scopedWhere, query, role !== 'MANAGER' ? userId : undefined);
    },

    getById: async (userId: string, role: string, ticketId: string) => {
        const ticket = await ticketsRepository.findById(ticketId, userId);
        if (!ticket) throw new NotFoundError('Ticket not found');

        const canView =
            (role === 'MANAGER' &&
                ((await isPropertyManagedBy(ticket.propertyId, userId)) || ticket.assignedToId === userId)) ||
            ticket.userId === userId;

        if (!canView) throw new ForbiddenError('You cannot view this ticket');
        return ticket;
    },

    updateStatus: async (userId: string, role: string, ticketId: string, newStatus: TicketStatus) => {
        const ticket = await ticketsRepository.findById(ticketId);
        if (!ticket) throw new NotFoundError('Ticket not found');

        if (
            role === 'MANAGER' &&
            !(await isPropertyManagedBy(ticket.propertyId, userId)) &&
            ticket.assignedToId !== userId
        ) {
            throw new ForbiddenError('You do not manage or are not assigned to this ticket');
        }

        const allowed = ALLOWED_TRANSITIONS[ticket.status];
        if (!allowed.includes(newStatus)) {
            throw new AppError(`Invalid transition: ${ticket.status} → ${newStatus}`, 400);
        }

        // Reopening a ticket from any terminal state (RESOLVED or DISMISSED) whose assignee
        // has since been soft-deleted would make it active again while owned by someone who
        // can't act on it. Return it to the triage queue instead of silently reactivating a
        // dead assignment.
        if (
            (ticket.status === 'RESOLVED' || ticket.status === 'DISMISSED') &&
            newStatus === 'IN_PROGRESS' &&
            ticket.assignedToId
        ) {
            const assignee = await db.user.findUnique({
                where: { id: ticket.assignedToId },
                select: { deletedAt: true }
            });
            if (!assignee || assignee.deletedAt) {
                const reopened = await ticketsRepository.reopenToTriage(ticketId);

                // Reopened into triage with no assignee → notify all admins (fire-and-forget)
                void dispatchTicketNotifications(reopened).catch(err =>
                    logger.error({ ticketId: reopened.id, err }, 'Ticket reopen-to-triage notification failed')
                );

                emitTicketEvent(reopened.userId, {
                    type: 'status_changed',
                    ticketId: reopened.id,
                    status: reopened.status
                });

                return reopened;
            }
        }

        // Stamp resolution time on entry to RESOLVED; clear it when leaving RESOLVED.
        // Any other transition leaves resolvedAt untouched (undefined).
        const resolvedAt = newStatus === 'RESOLVED' ? new Date() : ticket.status === 'RESOLVED' ? null : undefined;

        const updated = await ticketsRepository.updateStatus(ticketId, newStatus, resolvedAt);
        emitTicketEvent(updated.userId, { type: 'status_changed', ticketId: updated.id, status: updated.status });
        return updated;
    },

    /**
     * A reporter withdrawing their own report (e.g. filed by mistake). Deliberately narrow:
     * only the owner, only while OPEN (before staff engage), and the sole outcome is DISMISSED.
     * This is the USER-facing counterpart to the staff-only updateStatus state machine —
     * keeping it separate stops users from reaching any other transition.
     */
    withdraw: async (userId: string, ticketId: string) => {
        const ticket = await ticketsRepository.findById(ticketId);
        if (!ticket) throw new NotFoundError('Ticket not found');

        if (ticket.userId !== userId) {
            throw new ForbiddenError('You can only withdraw your own report');
        }
        if (ticket.status !== 'OPEN') {
            throw new AppError('Only an open report can be withdrawn', 400);
        }

        return ticketsRepository.updateStatus(ticketId, 'DISMISSED');
    },

    reassign: async (ticketId: string, assignedToId: string | null, userId: string) => {
        const ticket = await ticketsRepository.findById(ticketId);
        if (!ticket) throw new NotFoundError('Ticket not found');

        // Same authority as any other action on the ticket: you manage the property,
        // or the ticket is currently yours. The property's manager never loses the
        // ability to redirect work on their own property, so nothing can be stranded.
        if (!(await isPropertyManagedBy(ticket.propertyId, userId)) && ticket.assignedToId !== userId) {
            throw new ForbiddenError('You do not manage or are not assigned to this ticket');
        }

        if (assignedToId) {
            const target = await db.user.findFirst({
                where: { id: assignedToId, deletedAt: null, role: 'MANAGER' }
            });
            if (!target) throw new AppError('Assignee must be an existing manager', 400);
        }
        const updated = await ticketsRepository.reassign(ticketId, assignedToId);

        // Notify the new assignee (fire-and-forget)
        void dispatchTicketNotifications(updated).catch(err =>
            logger.error({ ticketId: updated.id, err }, 'Ticket reassignment notification failed')
        );

        return updated;
    },

    /** Thread is visible to exactly whoever can view the ticket — getById enforces it. */
    getMessages: async (userId: string, role: string, ticketId: string) => {
        await ticketsService.getById(userId, role, ticketId);
        return ticketsRepository.listMessages(ticketId);
    },

    addMessage: async (userId: string, role: string, ticketId: string, body: string) => {
        const ticket = await ticketsService.getById(userId, role, ticketId);
        const message = await ticketsRepository.createMessage(ticketId, userId, body);

        // Authorship by relationship, not role: a staff member reporting their own
        // ticket replies as the reporter, not as staff.
        if (userId === ticket.userId) {
            void dispatchUserReplyNotifications(ticket, body).catch(err =>
                logger.error({ ticketId, err }, 'User-reply notification failed')
            );
        } else {
            // Socket reaches the guest only if they are in the app right now;
            // the email is what makes the reply survive them being offline.
            emitTicketEvent(ticket.userId, { type: 'new_message', ticketId, message });
            void dispatchStaffReplyNotifications(ticket, body).catch(err =>
                logger.error({ ticketId, err }, 'Staff-reply notification failed')
            );
        }
        return message;
    },

    markSeen: async (userId: string, ticketId: string) => {
        const ticket = await ticketsRepository.findById(ticketId);
        if (!ticket) throw new NotFoundError('Ticket not found');
        if (ticket.userId !== userId) throw new ForbiddenError('Only the reporter can mark a ticket as seen');
        await ticketsRepository.markSeen(ticketId);
    },

    /** Total unread staff replies across the reporter's own tickets — drives the header badge. */
    getUnreadCount: async (userId: string): Promise<number> => {
        return ticketsRepository.unreadCountForReporter(userId);
    },

    /**
     * Drafts a reply suggestion for staff using gpt-4o-mini. getById enforces the
     * caller may view this ticket (manages the property / is the assignee / admin);
     * the route also restricts to MANAGER/ADMIN. Never persists anything.
     */
    suggestReply: async (
        userId: string,
        role: string,
        ticketId: string,
        language?: TicketReplyLanguage
    ): Promise<string> => {
        const ticket = await ticketsService.getById(userId, role, ticketId);
        const messages = await ticketsRepository.listMessages(ticketId);

        if (isOpenAIMocked) {
            await delay(800);
            return MOCK_REPLY_SUGGESTION;
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.5,
            messages: [
                { role: 'system', content: SUGGEST_REPLY_SYSTEM_PROMPT },
                { role: 'user', content: buildReplySuggestionPrompt(ticket, messages, language) }
            ]
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new AppError('AI returned an empty suggestion', 502);

        let json: unknown;
        try {
            json = JSON.parse(raw);
        } catch {
            // Non-JSON despite json_object mode (e.g. truncation) → honor the 502 contract.
            throw new AppError('AI returned an unusable suggestion', 502);
        }

        const parsed = ReplySuggestionSchema.safeParse(json);
        if (!parsed.success) {
            logger.warn({ ticketId, raw }, 'Reply suggestion failed schema validation');
            throw new AppError('AI returned an unusable suggestion', 502);
        }
        return parsed.data.reply;
    }
};
