import type { TicketCategory } from '@prisma/client';

/**
 * A designated handler for a category, with the two signals used to choose
 * between several of them.
 */
export type HandlerCandidate = {
    id: string;
    /** Manages at least one alive property in the same city as the ticket's property. */
    managesInCity: boolean;
    /** Currently assigned OPEN + IN_PROGRESS tickets — their live workload. */
    openTickets: number;
};

/**
 * Pure decision function: who owns a newly created ticket.
 *
 * Precedence, in order:
 *  1. The property's manager, when they are a designated handler for the category
 *     — locality beats specialism for someone who is both. This is also what stops
 *     a volunteer specialist from taking tickets off a manager who has opted in.
 *  2. Otherwise the best designated handler for the category, ranked by:
 *       a. manages a property in the same city  — local knowledge, can attend
 *       b. fewest open tickets                  — spreads load between volunteers
 *       c. id ascending                         — last resort, purely for reproducibility
 *  3. The property's manager — the guaranteed fallback that replaced the old admin
 *     triage queue. Because every property has a live manager, this is almost
 *     always what happens when routing is unconfigured.
 *  4. null — only for a legacy property with no manager and no applicable handler.
 *
 * Ranking by (a) then (b) rather than by id is what makes two volunteers on the
 * same category actually share the work: sorting by id alone would hand every
 * such ticket to whichever of them has the smaller id, permanently.
 */
export function chooseTicketAssignee(
    category: TicketCategory | null,
    propertyManagerId: string | null,
    handlers: HandlerCandidate[]
): string | null {
    if (category && handlers.length > 0) {
        if (propertyManagerId && handlers.some(h => h.id === propertyManagerId)) {
            return propertyManagerId;
        }
        const ranked = [...handlers].sort(
            (a, b) =>
                Number(b.managesInCity) - Number(a.managesInCity) ||
                a.openTickets - b.openTickets ||
                a.id.localeCompare(b.id)
        );
        return ranked[0].id;
    }
    return propertyManagerId;
}
