import type { Invitation as PrismaInvitation, Prisma } from '@prisma/client';
import type { Invitation, UserRole } from '@staylark/contract';
import { db } from '../../../config/database.js';

type Row = PrismaInvitation & { invitedBy?: { name: string } | null };

function toInvitation(row: Row, now: Date): Invitation {
    const derivedStatus = row.status === 'PENDING' && row.expiresAt < now ? 'EXPIRED' : row.status;
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: derivedStatus,
        expiresAt: row.expiresAt.toISOString(),
        inviterName: row.invitedBy?.name ?? null,
        acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString()
    };
}

export const invitationsRepository = {
    findByTokenHash: async (tokenHash: string) => {
        return db.invitation.findUnique({
            where: { tokenHash },
            include: { invitedBy: { select: { name: true } } }
        });
    },

    listAll: async (now: Date): Promise<Invitation[]> => {
        const rows = await db.invitation.findMany({
            include: { invitedBy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return rows.map(r => toInvitation(r, now));
    },

    findById: async (id: string) => db.invitation.findUnique({ where: { id } }),

    /** Insert a fresh invitation OR overwrite the existing pending one (resend). */
    upsertPending: async (data: {
        email: string;
        name: string;
        role: UserRole;
        tokenHash: string;
        expiresAt: Date;
        invitedById: string;
    }): Promise<Invitation> => {
        const existing = await db.invitation.findFirst({
            where: { email: data.email, status: 'PENDING' }
        });
        const row = existing
            ? await db.invitation.update({
                  where: { id: existing.id },
                  data: { ...data, status: 'PENDING' },
                  include: { invitedBy: { select: { name: true } } }
              })
            : await db.invitation.create({
                  data,
                  include: { invitedBy: { select: { name: true } } }
              });
        return toInvitation(row, new Date(0)); // freshly created → never expired
    },

    setToken: async (id: string, tokenHash: string, expiresAt: Date): Promise<Invitation> => {
        const row = await db.invitation.update({
            where: { id },
            data: { tokenHash, expiresAt, status: 'PENDING' },
            include: { invitedBy: { select: { name: true } } }
        });
        return toInvitation(row, new Date(0));
    },

    revoke: async (id: string) => db.invitation.update({ where: { id }, data: { status: 'REVOKED' } }),

    /**
     * Atomically claim a PENDING invitation (accept or honor-on-signup). Returns
     * the updated row, or null if it was already consumed/revoked (race guard).
     */
    claim: async (tx: Prisma.TransactionClient, id: string, acceptedUserId: string, now: Date): Promise<boolean> => {
        const res = await tx.invitation.updateMany({
            where: { id, status: 'PENDING' },
            data: { status: 'ACCEPTED', acceptedUserId, acceptedAt: now }
        });
        return res.count === 1;
    }
};
