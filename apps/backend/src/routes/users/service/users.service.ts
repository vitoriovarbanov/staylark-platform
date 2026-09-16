import { TICKET_STATUSES_TERMINAL } from '@staylark/contract';
import type { AdminUpdateUser, AdminUser, ManagerSummary, UserListQuery, UserListResponse } from '@staylark/contract';
import { usersRepository } from '../repository/users.repository.js';
import { db } from '../../../config/database.js';
import { AppError, ForbiddenError, NotFoundError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';

type Actor = { id: string; role: string };

/**
 * Does this user actually hold anything that would be stranded by removing them?
 *
 * The successor requirement exists to rescue a portfolio. With nothing to rescue
 * there is nothing to hand over, and demanding one is pointless friction — it also
 * makes the last-manager case unresolvable, since an empty manager could not be
 * wound down even after their properties were transferred away.
 */
async function hasPortfolio(userId: string): Promise<boolean> {
    const [properties, openTickets] = await Promise.all([
        db.property.count({ where: { managerId: userId, deletedAt: null } }),
        db.ticket.count({
            where: { assignedToId: userId, deletedAt: null, status: { notIn: [...TICKET_STATUSES_TERMINAL] } }
        })
    ]);
    return properties > 0 || openTickets > 0;
}

/** The successor must be an alive MANAGER, and cannot be the user being removed. */
async function assertValidSuccessor(successorId: string, targetId: string): Promise<void> {
    if (successorId === targetId) {
        throw new AppError('A user cannot succeed themselves', 400);
    }
    const successor = await usersRepository.findById(successorId);
    if (!successor || successor.role !== 'MANAGER') {
        throw new AppError('Successor must be an active manager', 400);
    }
}

export const usersService = {
    listManagers: async (): Promise<ManagerSummary[]> => {
        return usersRepository.findManagers();
    },

    list: async (filter: UserListQuery): Promise<UserListResponse> => {
        const { data, total } = await usersRepository.findMany(filter);
        return { data, total, page: filter.page, limit: filter.limit };
    },

    update: async (actor: Actor, targetId: string, patch: AdminUpdateUser): Promise<AdminUser> => {
        const target = await usersRepository.findByIdAny(targetId);
        if (!target || target.deletedAt) throw new NotFoundError('User not found');

        // Cannot change your own role — prevents an admin self-locking out of admin powers.
        if (targetId === actor.id && patch.role !== undefined) {
            throw new ForbiddenError('Cannot change your own role');
        }

        // Demoting an admin must not remove the last one — the repository enforces
        // this atomically (row-locked count) inside the same write transaction.
        const demotingAdmin = target.role === 'ADMIN' && patch.role !== undefined && patch.role !== 'ADMIN';

        // Demoting MANAGER/ADMIN → USER strips staff status, so any properties they
        // manage and any active tickets assigned to them must move to someone who is
        // still staff — otherwise they'd reference a non-staff user, and the property
        // would be unreachable by every role.
        const losingStaff = patch.role === 'USER' && target.role !== 'USER';

        // Only demand a successor when there is actually something to inherit.
        const needsSuccessor = losingStaff && (await hasPortfolio(targetId));
        if (needsSuccessor) {
            if (!patch.successorManagerId) {
                throw new AppError(
                    'A successor manager is required: this user manages properties or holds open tickets',
                    400
                );
            }
            await assertValidSuccessor(patch.successorManagerId, targetId);
        }

        const before = { name: target.name, role: target.role };
        // successorManagerId is a contract-only field — Prisma throws on unknown args,
        // so it must not reach user.update.
        const { successorManagerId, ...userFields } = patch;
        const updated = await usersRepository.update(targetId, userFields, {
            guardLastAdmin: demotingAdmin,
            transferPortfolioTo: needsSuccessor ? successorManagerId : undefined
        });

        logger.info({ actorId: actor.id, action: 'update', targetId, before, after: patch }, 'users.update');
        return updated;
    },

    restore: async (actor: Actor, targetId: string): Promise<void> => {
        const target = await usersRepository.findByIdAny(targetId);
        if (!target || target.deletedAt === null) throw new NotFoundError('Deleted user not found');

        await usersRepository.restore(targetId);
        logger.info({ actorId: actor.id, action: 'restore', targetId }, 'users.restore');
    },

    softDelete: async (targetId: string, actor: Actor, successorManagerId?: string) => {
        const target = await usersRepository.findById(targetId);
        if (!target) throw new NotFoundError('User not found');

        // Prevent admins from deleting themselves — would lock them out of recovery flows.
        if (target.id === actor.id) {
            throw new ForbiddenError('Cannot delete your own account');
        }

        // A manager's portfolio must land on another manager, or it is orphaned with
        // no recovery path. Non-managers have no portfolio, so no successor is needed.
        const needsSuccessor = target.role === 'MANAGER' && (await hasPortfolio(targetId));
        if (needsSuccessor) {
            if (!successorManagerId) {
                throw new AppError(
                    'A successor manager is required: this user manages properties or holds open tickets',
                    400
                );
            }
            await assertValidSuccessor(successorManagerId, targetId);
        }

        // Deleting an admin must not remove the last one (race-safe in the repository).
        await usersRepository.softDelete(targetId, {
            guardLastAdmin: target.role === 'ADMIN',
            successorManagerId: needsSuccessor ? successorManagerId : undefined
        });
    }
};
