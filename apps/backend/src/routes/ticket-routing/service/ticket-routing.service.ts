import type { TicketCategory } from '@staylark/contract';
import { db } from '../../../config/database.js';
import { ticketRoutingRepository } from '../repository/ticket-routing.repository.js';
import { AppError, ForbiddenError } from '../../../utils/errors.js';
import { assertSelfOnlyRoutingChange } from './self-service-routing.js';

const ALL_CATEGORIES: TicketCategory[] = ['NOISE', 'DAMAGE', 'CLEANLINESS', 'DELIVERY', 'UTILITIES', 'EMERGENCY'];

export const ticketRoutingService = {
    /** Returns every category, including ones with an empty assignee list. */
    list: async () => {
        const rows = await ticketRoutingRepository.listAll();
        return ALL_CATEGORIES.map(category => ({
            category,
            assignees: rows
                .filter(r => r.category === category)
                .map(r => ({ userId: r.user.id, name: r.user.name, email: r.user.email, role: r.user.role }))
        }));
    },

    /**
     * Replaces the handler set for one category.
     *
     * ADMIN may set it freely — routing is staffing config. A MANAGER may only
     * add or remove themselves: volunteering to handle a category is self-service,
     * but signing up (or dropping) another manager is not theirs to do.
     */
    updateCategory: async (category: TicketCategory, userIds: string[], actor: { id: string; role: string }) => {
        if (actor.role !== 'ADMIN') {
            const current = await ticketRoutingRepository.userIdsForCategory(category);
            try {
                assertSelfOnlyRoutingChange(current, userIds, actor.id);
            } catch (err) {
                throw new ForbiddenError((err as Error).message);
            }
        }

        if (userIds.length > 0) {
            const valid = await db.user.findMany({
                where: { id: { in: userIds }, deletedAt: null, role: 'MANAGER' },
                select: { id: true }
            });
            if (valid.length !== new Set(userIds).size) {
                throw new AppError('All assignees must be existing managers', 400);
            }
        }
        await ticketRoutingRepository.replaceCategory(category, [...new Set(userIds)]);
        return ticketRoutingService.list();
    }
};
