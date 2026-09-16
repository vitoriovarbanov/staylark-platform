import type { AdminStats, AdminPropertyStats, TicketStats } from '@staylark/contract';
import { adminRepository } from '../repository/admin.repository.js';
import { db } from '../../../config/database.js';

/**
 * Ids of every alive property this manager owns — the scope for all stats below.
 * An empty list is a legitimate state (a manager who owns nothing yet); the
 * repository returns zeroed payloads for it rather than querying unscoped.
 */
async function managedPropertyIds(managerId: string): Promise<string[]> {
    const rows = await db.property.findMany({
        where: { managerId, deletedAt: null },
        select: { id: true }
    });
    return rows.map(r => r.id);
}

export const adminService = {
    // Caching seam: dashboard stats are computed fresh on every request. If manager
    // traffic or query cost grows, wrap this in an in-memory TTL cache keyed by
    // manager id (see the pattern in routes/pricing/service/pricing.service.ts).
    async getStats(managerId: string): Promise<AdminStats> {
        return adminRepository.getStats(await managedPropertyIds(managerId));
    },

    async getPropertyStats(managerId: string): Promise<AdminPropertyStats[]> {
        return adminRepository.getPropertyStats(await managedPropertyIds(managerId));
    },

    async getTicketStats(
        managerId: string,
        startDate?: string,
        endDate?: string,
        propertyId?: string
    ): Promise<TicketStats> {
        return adminRepository.getTicketStats(await managedPropertyIds(managerId), startDate, endDate, propertyId);
    }
};
