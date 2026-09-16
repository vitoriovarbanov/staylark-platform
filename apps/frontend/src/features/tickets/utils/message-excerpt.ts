/**
 * Ticket reply bodies are free text of unbounded length (`TicketMessage.body`
 * is `@db.Text`) and staff replies routinely contain newlines and paragraphs.
 * A toast has room for roughly one line, so the raw body has to be collapsed
 * and clipped before it goes in — otherwise a long reply renders as a
 * wall of text covering the screen.
 */
export const MAX_EXCERPT_CHARS = 120;

/** Prefer cutting at a space, but only if one falls reasonably near the limit —
 *  otherwise a body with an early space would be clipped far too short. */
const MIN_WORD_BOUNDARY_RATIO = 0.6;

/**
 * Collapse a message body into a single-line preview suitable for a toast.
 * Returns the body unchanged when it already fits.
 */
export function messageExcerpt(body: string, maxChars: number = MAX_EXCERPT_CHARS): string {
    const collapsed = body.replace(/\s+/g, ' ').trim();
    if (collapsed.length <= maxChars) return collapsed;

    const clipped = collapsed.slice(0, maxChars);
    const lastSpace = clipped.lastIndexOf(' ');
    const cut = lastSpace >= maxChars * MIN_WORD_BOUNDARY_RATIO ? clipped.slice(0, lastSpace) : clipped;

    return `${cut.trimEnd()}…`;
}
