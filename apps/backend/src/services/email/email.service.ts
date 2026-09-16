import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { renderEmail, p, escapeHtml, unescapeHtml } from './layout.js';

// Sends are fire-and-forget (not awaited) so callers can't leak timing and a
// failed email never blocks the request. The Resend SDK returns `{ data, error }`
// rather than throwing on API errors, so we inspect `error` and log it.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export function sendEmail(to: string, subject: string, html: string): void {
    if (!resend) {
        // The href is HTML-escaped (`&` → `&amp;`); decode it so the logged link is
        // directly clickable/pasteable. A literal `&amp;` in the address bar mangles
        // the query param after it (e.g. callbackURL becomes `amp;callbackURL`).
        const urlMatch = html.match(/href="([^"]+)"/);
        const url = urlMatch ? unescapeHtml(urlMatch[1]) : undefined;
        logger.info({ to, subject, url }, '[EMAIL] — dev log (no Resend key)');
        return;
    }

    resend.emails
        .send({ from: env.RESEND_FROM_EMAIL, to, subject, html })
        .then(({ data, error }) => {
            if (error) logger.error({ to, subject, error }, '[EMAIL] Resend rejected the send');
            else logger.info({ to, subject, id: data?.id }, '[EMAIL] sent via Resend');
        })
        .catch(err => logger.error({ to, subject, err }, '[EMAIL] send threw'));
}

export function sendBookingAutoExpiredEmail(params: {
    to: string;
    propertyTitle: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
}): void {
    const propertyUrl = `${env.FRONTEND_URL}/properties/${params.propertyId}`;
    const subject = `Your booking at ${params.propertyTitle} was cancelled`;
    const html = renderEmail({
        heading: 'Your booking was cancelled',
        bodyHtml:
            p(
                `Your booking at <strong>${escapeHtml(params.propertyTitle)}</strong> for <strong>${escapeHtml(params.checkIn)}</strong> → <strong>${escapeHtml(params.checkOut)}</strong> was cancelled because it wasn't confirmed in time.`
            ) + p('You can book this property again or pick another place.'),
        button: { label: 'Book again', url: propertyUrl }
    });

    sendEmail(params.to, subject, html);
}

export function sendBookingConfirmedEmail(params: {
    to: string;
    propertyTitle: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
}): void {
    const propertyUrl = `${env.FRONTEND_URL}/properties/${params.propertyId}`;
    const subject = `Your booking at ${params.propertyTitle} is confirmed`;
    const html = renderEmail({
        heading: 'Your booking is confirmed',
        bodyHtml: p(
            `Good news — your booking at <strong>${escapeHtml(params.propertyTitle)}</strong> for <strong>${escapeHtml(params.checkIn)}</strong> → <strong>${escapeHtml(params.checkOut)}</strong> has been confirmed by your host.`
        ),
        button: { label: 'View your booking', url: propertyUrl }
    });

    sendEmail(params.to, subject, html);
}

const eurFormatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

export function sendNewBookingEmail(params: {
    to: string;
    recipientName: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
}): void {
    const subject = `New booking — ${params.propertyTitle}`;
    const body =
        p(`Hi ${escapeHtml(params.recipientName)},`) +
        p(`A new booking was placed for <strong>${escapeHtml(params.propertyTitle)}</strong>.`) +
        p(
            `<strong>${escapeHtml(params.checkIn)}</strong> → <strong>${escapeHtml(params.checkOut)}</strong> · <strong>${escapeHtml(eurFormatter.format(params.totalPrice))}</strong>`
        );
    sendEmail(
        params.to,
        subject,
        renderEmail({
            heading: 'A new booking came in',
            bodyHtml: body,
            preheader: `New booking · ${params.propertyTitle}`
        })
    );
}

export function sendInviteEmail(params: { to: string; inviterName: string; role: string; token: string }): void {
    const acceptUrl = `${env.FRONTEND_URL}/accept-invite?token=${params.token}`;
    const subject = `${params.inviterName} invited you to Staylark`;
    const html = renderEmail({
        heading: 'You have been invited to Staylark',
        bodyHtml:
            p(
                `<strong>${escapeHtml(params.inviterName)}</strong> invited you to join <strong>Staylark</strong> as <strong>${escapeHtml(params.role)}</strong>.`
            ) +
            p('Accept the invitation below to set your password and get started.') +
            p('This invitation expires in 7 days.'),
        button: { label: 'Accept invitation', url: acceptUrl }
    });
    sendEmail(params.to, subject, html);
}

export function sendTicketAssignedEmail(params: {
    to: string;
    assigneeName: string;
    propertyTitle: string;
    category: string;
    priority: string;
    summary: string | null;
    ticketId: string;
}): void {
    const url = `${env.FRONTEND_URL}/admin/tickets?ticket=${params.ticketId}`;
    const subject = `New ${params.priority} ${params.category} ticket assigned to you`;
    const body =
        p(`Hi ${escapeHtml(params.assigneeName)},`) +
        p(
            `A <strong>${escapeHtml(params.priority)}</strong> priority <strong>${escapeHtml(params.category)}</strong> ticket has been assigned to you for <strong>${escapeHtml(params.propertyTitle)}</strong>.`
        ) +
        (params.summary ? p(`"${escapeHtml(params.summary)}"`) : '');
    sendEmail(
        params.to,
        subject,
        renderEmail({
            heading: 'A ticket was assigned to you',
            bodyHtml: body,
            button: { label: 'View ticket', url },
            preheader: `${params.category} · ${params.propertyTitle}`
        })
    );
}

export function sendTicketUserRepliedEmail(params: {
    to: string;
    recipientName: string;
    propertyTitle: string;
    summary: string | null;
    messageBody: string;
    ticketId: string;
}): void {
    const url = `${env.FRONTEND_URL}/admin/tickets?ticket=${params.ticketId}`;
    const subject = `Guest replied — ${params.propertyTitle}`;
    const body =
        p(`Hi ${escapeHtml(params.recipientName)},`) +
        p(`The guest posted a reply on a ticket for <strong>${escapeHtml(params.propertyTitle)}</strong>.`) +
        (params.summary ? p(`Ticket: "${escapeHtml(params.summary)}"`) : '') +
        p(`Reply: "${escapeHtml(params.messageBody)}"`);
    sendEmail(
        params.to,
        subject,
        renderEmail({
            heading: 'A guest replied on a ticket',
            bodyHtml: body,
            button: { label: 'View ticket', url },
            preheader: `Guest reply · ${params.propertyTitle}`
        })
    );
}

/**
 * Reply bodies are unbounded (`TicketMessage.body` is `@db.Text`). Email has far
 * more room than a toast, but a pasted wall of text still shouldn't be mailed
 * verbatim — the button leads to the full thread.
 */
const MAX_EMAILED_REPLY_CHARS = 600;

export function truncateForEmail(text: string): string {
    const collapsed = text.trim();
    return collapsed.length > MAX_EMAILED_REPLY_CHARS
        ? `${collapsed.slice(0, MAX_EMAILED_REPLY_CHARS).trimEnd()}…`
        : collapsed;
}

export function sendTicketStaffRepliedEmail(params: {
    to: string;
    recipientName: string;
    propertyTitle: string;
    summary: string | null;
    messageBody: string;
    ticketId: string;
}): void {
    const url = `${env.FRONTEND_URL}/tickets?ticket=${params.ticketId}`;
    const subject = `Update on your report — ${params.propertyTitle}`;
    const body =
        p(`Hi ${escapeHtml(params.recipientName)},`) +
        p(`Our team replied to the problem you reported at <strong>${escapeHtml(params.propertyTitle)}</strong>.`) +
        (params.summary ? p(`Your report: "${escapeHtml(params.summary)}"`) : '') +
        p(`Reply: "${escapeHtml(truncateForEmail(params.messageBody))}"`);
    sendEmail(
        params.to,
        subject,
        renderEmail({
            heading: 'We replied to your report',
            bodyHtml: body,
            button: { label: 'View the conversation', url },
            preheader: `Reply from the team · ${params.propertyTitle}`
        })
    );
}
