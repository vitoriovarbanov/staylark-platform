import { Prisma, type PricingRuleType } from '@prisma/client';
import { db } from '../../../config/database.js';
import type { PricingRule } from '@staylark/contract';

export interface RuleListFilter {
    propertyId?: string;
    activeOn?: string; // YYYY-MM-DD
    includeInactive: boolean;
    page: number;
    limit: number;
    /**
     * When present, restricts the list to rules whose property is owned by
     * this manager (alive) OR is global (`propertyId IS NULL`).
     * Applied as a relation filter — no separate property-id roundtrip.
     */
    managerId?: string;
}

export interface RuleCreateInput {
    propertyId: string | null;
    name: string;
    type: PricingRuleType;
    multiplier: number;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    isActive: boolean;
    minNights: number | null;
}

export interface RuleUpdateInput {
    name?: string;
    type?: PricingRuleType;
    multiplier?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    minNights?: number | null;
}

const toDateUTC = (s: string): Date => new Date(`${s}T00:00:00.000Z`);

type DbRow = Awaited<ReturnType<typeof db.pricingRule.findFirstOrThrow>>;

const fromRow = (row: DbRow): PricingRule => ({
    id: row.id,
    propertyId: row.propertyId,
    name: row.name,
    type: row.type,
    multiplier: row.multiplier.toNumber(),
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate.toISOString().slice(0, 10),
    isActive: row.isActive,
    minNights: row.minNights,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
});

const buildWhere = (
    f: Pick<RuleListFilter, 'propertyId' | 'activeOn' | 'includeInactive' | 'managerId'>
): Prisma.PricingRuleWhereInput => {
    const where: Prisma.PricingRuleWhereInput = {};
    if (f.propertyId !== undefined) where.propertyId = f.propertyId;
    if (!f.includeInactive) where.isActive = true;
    if (f.activeOn) {
        const d = toDateUTC(f.activeOn);
        where.startDate = { lte: d };
        where.endDate = { gte: d };
    }
    if (f.managerId !== undefined) {
        // Pushed into AND (not top-level OR) so a future filter that also
        // writes top-level OR can't silently clobber the scope clause.
        const managerClause: Prisma.PricingRuleWhereInput = {
            OR: [{ property: { managerId: f.managerId, deletedAt: null } }, { propertyId: null }]
        };
        where.AND = Array.isArray(where.AND)
            ? [...where.AND, managerClause]
            : where.AND
              ? [where.AND, managerClause]
              : [managerClause];
    }
    return where;
};

export const pricingRulesRepository = {
    list: async (f: RuleListFilter): Promise<{ data: PricingRule[]; total: number }> => {
        const where = buildWhere(f);
        const skip = (f.page - 1) * f.limit;
        const [rows, total] = await Promise.all([
            db.pricingRule.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: f.limit
            }),
            db.pricingRule.count({ where })
        ]);
        return { data: rows.map(fromRow), total };
    },

    findById: async (id: string): Promise<PricingRule | null> => {
        const row = await db.pricingRule.findUnique({ where: { id } });
        return row ? fromRow(row) : null;
    },

    create: async (input: RuleCreateInput): Promise<PricingRule> => {
        const row = await db.pricingRule.create({
            data: {
                propertyId: input.propertyId,
                name: input.name,
                type: input.type,
                multiplier: new Prisma.Decimal(input.multiplier),
                startDate: toDateUTC(input.startDate),
                endDate: toDateUTC(input.endDate),
                isActive: input.isActive,
                minNights: input.minNights
            }
        });
        return fromRow(row);
    },

    update: async (id: string, input: RuleUpdateInput): Promise<PricingRule> => {
        const data: Prisma.PricingRuleUpdateInput = {};
        if (input.name !== undefined) data.name = input.name;
        if (input.type !== undefined) data.type = input.type;
        if (input.multiplier !== undefined) data.multiplier = new Prisma.Decimal(input.multiplier);
        if (input.startDate !== undefined) data.startDate = toDateUTC(input.startDate);
        if (input.endDate !== undefined) data.endDate = toDateUTC(input.endDate);
        if (input.isActive !== undefined) data.isActive = input.isActive;
        if (input.minNights !== undefined) data.minNights = input.minNights;

        const row = await db.pricingRule.update({ where: { id }, data });
        return fromRow(row);
    },

    softDelete: async (id: string): Promise<PricingRule> => {
        const row = await db.pricingRule.update({ where: { id }, data: { isActive: false } });
        return fromRow(row);
    },

    /** Used by service to pre-check FK + soft-delete on create (ADMIN path). */
    propertyExistsAndAlive: async (propertyId: string): Promise<boolean> => {
        const p = await db.property.findFirst({
            where: { id: propertyId, deletedAt: null },
            select: { id: true }
        });
        return p !== null;
    },

    /**
     * One-shot: is this property alive AND owned by this manager? Used for
     * MANAGER createRule/updateRule/deleteRule per-rule ownership checks.
     * Accepts an optional Prisma transaction client so the caller can run it
     * inside a transaction (closes the TOCTOU race on create).
     */
    propertyOwnedByAndAlive: async (
        propertyId: string,
        managerId: string,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> => {
        const client = tx ?? db;
        const p = await client.property.findFirst({
            where: { id: propertyId, managerId, deletedAt: null },
            select: { id: true }
        });
        return p !== null;
    }
};
