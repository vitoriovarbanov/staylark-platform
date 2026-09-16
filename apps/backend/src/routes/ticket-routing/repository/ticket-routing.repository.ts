import { db } from '../../../config/database.js';
import type { TicketCategory } from '@prisma/client';

export const ticketRoutingRepository = {
    /** All categories with their assigned MANAGER/ADMIN users (alive, staff only). */
    listAll: async () => {
        return db.ticketCategoryAssignee.findMany({
            // Filter on current role too: a MANAGER can be downgraded to USER after being
            // mapped, and their row survives (only delete cascades). Don't surface them.
            where: { user: { deletedAt: null, role: 'MANAGER' } },
            select: {
                category: true,
                user: { select: { id: true, name: true, email: true, role: true } }
            }
        });
    },

    /** Replace the whole set for one category in a single transaction. */
    replaceCategory: async (category: TicketCategory, userIds: string[]) => {
        await db.$transaction([
            db.ticketCategoryAssignee.deleteMany({ where: { category } }),
            ...(userIds.length
                ? [db.ticketCategoryAssignee.createMany({ data: userIds.map(userId => ({ category, userId })) })]
                : [])
        ]);
    },

    /** Just the userIds mapped to a category — used by resolveAssignee. Staff only. */
    userIdsForCategory: async (category: TicketCategory): Promise<string[]> => {
        const rows = await db.ticketCategoryAssignee.findMany({
            where: { category, user: { deletedAt: null, role: 'MANAGER' } },
            select: { userId: true }
        });
        return rows.map(r => r.userId);
    }
};
