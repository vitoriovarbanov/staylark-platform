import { z } from 'zod';
import type { Ticket, TicketMessage, TicketReplyLanguage } from '@staylark/contract';

/** Zod guard for the model's JSON output. */
export const ReplySuggestionSchema = z.object({
    reply: z.string().min(1).max(2000)
});

export const SUGGEST_REPLY_SYSTEM_PROMPT = `You draft a reply that a property manager will review, edit, and send to a guest who reported a problem during their stay.

Rules:
- LANGUAGE: detect the language of the guest's ORIGINAL problem report (shown first below) and write the ENTIRE reply in that language — an English report ("the sink is leaking") gets an English reply, a Bulgarian report ("проблем с мивката") gets a Bulgarian reply. Base this ONLY on the guest's report, never on staff notes.
- Tone: professional, warm, empathetic, concise — 2 to 5 sentences.
- Acknowledge the specific problem and give a concrete next step or question.
- Do NOT invent facts. Do NOT promise specific refunds, compensation, discounts, or exact timelines unless they already appear in the conversation.
- If essential information is missing to resolve the issue, ask one clear clarifying question instead of guessing.
- Do not mention that you are an AI.

Return ONLY a JSON object of the form: {"reply": "<the reply text>"}.`;

/** Shown when USE_OPENAI_MOCK=true so local dev works without an API key. */
export const MOCK_REPLY_SUGGESTION =
    'Hi, thank you for letting us know — I’m sorry for the trouble this has caused. I’ve flagged it with our team to look into right away and will update you as soon as I have more. In the meantime, could you confirm whether the issue is still ongoing?';

const MAX_MESSAGES = 20;
const MAX_BODY_CHARS = 1000;

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

type PromptTicket = Pick<
    Ticket,
    'userId' | 'transcription' | 'summary' | 'category' | 'priority' | 'propertyTitle' | 'propertyCity' | 'status'
>;
type PromptMessage = Pick<TicketMessage, 'authorId' | 'body'>;

/**
 * Builds the user-content prompt for a reply suggestion from the ticket's
 * problem context and the conversation. Pure + deterministic — the testable
 * seam. Guest = a message authored by the ticket's reporter (ticket.userId).
 */
export function buildReplySuggestionPrompt(
    ticket: PromptTicket,
    messages: PromptMessage[],
    language?: TicketReplyLanguage
): string {
    // The raw transcription is the guest's own words — the single source of truth for
    // the reply language. The summary is AI-generated and may not preserve the original
    // language, so it's only added as extra context, never as the language anchor.
    const original = ticket.transcription ?? ticket.summary ?? 'No description provided.';
    const lines: string[] = [
        "Guest's original problem report (write your reply in THIS language):",
        `"${truncate(original, MAX_BODY_CHARS)}"`
    ];
    if (ticket.summary && ticket.transcription && ticket.summary !== ticket.transcription) {
        lines.push('', `Summary (context only): ${truncate(ticket.summary, MAX_BODY_CHARS)}`);
    }
    lines.push(
        '',
        `Category: ${ticket.category ?? 'Uncategorized'} | Priority: ${ticket.priority} | Status: ${ticket.status}`,
        `Property: ${ticket.propertyTitle}, ${ticket.propertyCity}`,
        '',
        'Conversation so far (oldest first):'
    );

    const recent = messages.slice(-MAX_MESSAGES);
    if (recent.length === 0) {
        lines.push('(no replies yet — draft the first response)');
    } else {
        for (const m of recent) {
            const who = m.authorId === ticket.userId ? 'Guest' : 'Staff';
            lines.push(`${who}: ${truncate(m.body, MAX_BODY_CHARS)}`);
        }
    }

    // An explicit language overrides the auto-detect rule in the system prompt;
    // otherwise the model matches the guest's original report (see SUGGEST_REPLY_SYSTEM_PROMPT).
    lines.push(
        '',
        language
            ? `Write the staff reply now in ${language}, regardless of the language used in the report or thread.`
            : 'Write the staff reply now.'
    );
    return lines.join('\n');
}
