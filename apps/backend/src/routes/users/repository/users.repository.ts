import type { Prisma, User } from '@prisma/client';
import type { AdminUser, UserListQuery, UserSortField } from '@staylark/contract';
import { TICKET_STATUSES_TERMINAL } from '@staylark/contract';
import { db } from '../../../config/database.js';
import { AppError } from '../../../utils/errors.js';
import { buildOrderBy } from '../../../utils/list-order.js';

const USER_SORT: Record<
    UserSortField,
    (dir: 'asc' | 'desc') => Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[]
> = {
    createdAt: dir => ({ createdAt: dir }),
    name: dir => ({ name: dir }),
    role: dir => ({ role: dir })
};

// Preserves today's behavior when no sort is requested.
const USER_SORT_FALLBACK: Prisma.UserOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { name: 'asc' }];

/** Maps a Prisma User row to the AdminUser contract shape (Dates → ISO strings). */
function toAdminUser(row: User): AdminUser {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        subscriptionTier: row.subscriptionTier,
        phone: row.phone,
        avatarUrl: row.avatarUrl,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null
    };
}

/**
 * Locks every alive ADMIN row `FOR UPDATE` inside the given transaction and
 * throws if removing one would leave zero admins. The row locks serialize
 * concurrent admin-count-reducing mutations (demote / soft-delete), so the
 * guard can't be bypassed by two requests that each read the count before the
 * other commits. Must be called inside a transaction.
 */
async function assertNotLastAdmin(tx: Prisma.TransactionClient): Promise<void> {
    const admins = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "user" WHERE role = 'ADMIN' AND "deletedAt" IS NULL FOR UPDATE`;
    if (admins.length <= 1) throw new AppError('Cannot remove the last admin', 400);
}

export const usersRepository = {
    findById: async (id: string) => {
        return db.user.findFirst({ where: { id, deletedAt: null } });
    },

    /** Find by id regardless of soft-delete state — used by restore. */
    findByIdAny: async (id: string) => {
        return db.user.findUnique({ where: { id } });
    },

    /** Find by email regardless of soft-delete state — used to pre-empt invite duplicates. */
    findByEmailAny: async (email: string) => {
        return db.user.findUnique({ where: { email } });
    },

    /** Paginated, filtered user list for the admin table. */
    findMany: async (filter: UserListQuery): Promise<{ data: AdminUser[]; total: number }> => {
        const where: Prisma.UserWhereInput = {};
        if (!filter.includeDeleted) where.deletedAt = null;
        if (filter.role) where.role = filter.role;
        if (filter.search) {
            where.OR = [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { email: { contains: filter.search, mode: 'insensitive' } }
            ];
        }

        const skip = (filter.page - 1) * filter.limit;
        const [rows, total] = await Promise.all([
            db.user.findMany({
                where,
                orderBy: buildOrderBy(filter.sortBy, filter.sortOrder, USER_SORT, USER_SORT_FALLBACK),
                skip,
                take: filter.limit
            }),
            db.user.count({ where })
        ]);
        return { data: rows.map(toAdminUser), total };
    },

    /**
     * Clears the soft-delete marker and re-links properties that were unassigned
     * when this user was deleted. Properties reassigned to someone else in the
     * meantime keep their current manager; we only reclaim ones still unassigned.
     */
    restore: async (id: string) => {
        return db.$transaction(async tx => {
            const updated = await tx.user.update({ where: { id }, data: { deletedAt: null } });
            // Reclaim properties still unassigned since this manager's deletion.
            await tx.property.updateMany({
                where: { previousManagerId: id, managerId: null, deletedAt: null },
                data: { managerId: id, previousManagerId: null }
            });
            // Drop the stash on any others (reassigned while deleted) so it can't
            // be wrongly reclaimed by a future restore.
            await tx.property.updateMany({
                where: { previousManagerId: id },
                data: { previousManagerId: null }
            });
            return updated;
        });
    },

    /**
     * Updates mutable admin-editable fields (name, role) and returns the mapped
     * AdminUser row (saves a follow-up read). When `guardLastAdmin` is set, the
     * write runs in a transaction that first locks the admin rows and refuses to
     * drop the admin count below one.
     */
    update: async (
        id: string,
        data: { name?: string; role?: User['role'] },
        opts: { guardLastAdmin?: boolean; transferPortfolioTo?: string } = {}
    ): Promise<AdminUser> => {
        if (!opts.guardLastAdmin && !opts.transferPortfolioTo) {
            return toAdminUser(await db.user.update({ where: { id }, data }));
        }
        return db.$transaction(async tx => {
            if (opts.guardLastAdmin) await assertNotLastAdmin(tx);
            const updated = await tx.user.update({ where: { id }, data });
            if (opts.transferPortfolioTo) {
                // A demoted user is no longer staff, so their properties must move to
                // someone who still is. Transferring rather than unassigning is what
                // keeps "every alive property has a live manager" true — an invariant
                // the ticket fallback and every scoping query now depend on.
                // previousManagerId is cleared: a demotion has no restore path.
                await tx.property.updateMany({
                    where: { managerId: id, deletedAt: null },
                    data: { managerId: opts.transferPortfolioTo, previousManagerId: null }
                });
                // Open tickets follow the portfolio; terminal (resolved/dismissed)
                // tickets keep the historical assignee.
                await tx.ticket.updateMany({
                    where: { assignedToId: id, deletedAt: null, status: { notIn: [...TICKET_STATUSES_TERMINAL] } },
                    data: { assignedToId: opts.transferPortfolioTo }
                });
            }
            return toAdminUser(updated);
        });
    },

    /**
     * Alive MANAGERs — used for assignment dropdowns, transfer targets, successor
     * pickers and routing config. Admins are excluded: they can neither manage a
     * property nor be assigned a ticket.
     */
    findManagers: async () => {
        return db.user.findMany({
            where: { deletedAt: null, role: 'MANAGER' },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' }
        });
    },

    /**
     * Marks the user as soft-deleted, revokes all their Better Auth sessions,
     * and hands their portfolio to `successorManagerId` — all in one
     * transaction. Sessions are hard-deleted so the user is logged out
     * immediately. Properties move to the successor rather than becoming
     * unassigned: admins hold no property access, so an orphan would have no
     * recovery path at all.
     *
     * Booking / Feedback / Ticket references to the user are NOT touched —
     * those are transaction records retained for legal/tax purposes. If/when
     * we add a separate "Erase data" GDPR action, that will additionally
     * redact PII fields on the User row (name, email, phone, avatarUrl) but
     * still preserve the referenced row.
     */
    softDelete: async (id: string, opts: { guardLastAdmin?: boolean; successorManagerId?: string } = {}) => {
        return db.$transaction(async tx => {
            if (opts.guardLastAdmin) await assertNotLastAdmin(tx);
            const updated = await tx.user.update({
                where: { id, deletedAt: null },
                data: { deletedAt: new Date() }
            });
            await tx.session.deleteMany({ where: { userId: id } });

            // A USER being deleted has no portfolio, so there is nothing to move.
            if (opts.successorManagerId) {
                // Only touch alive properties — soft-deleted ones keep their historical
                // managerId for audit. previousManagerId is still stashed for the audit
                // trail; restore deliberately will NOT reclaim these, because the
                // property now has a live manager (see `restore` above).
                await tx.property.updateMany({
                    where: { managerId: id, deletedAt: null },
                    data: { managerId: opts.successorManagerId, previousManagerId: id }
                });
                // Tickets assigned to this manager would otherwise keep pointing at a dead
                // account (the assignedTo SetNull only fires on a HARD delete, not on this
                // soft-delete). Hand the open ones to the successor; terminal
                // (resolved/dismissed) tickets keep the historical assignee as a record.
                await tx.ticket.updateMany({
                    where: { assignedToId: id, deletedAt: null, status: { notIn: [...TICKET_STATUSES_TERMINAL] } },
                    data: { assignedToId: opts.successorManagerId }
                });
            }
            return updated;
        });
    }
};
