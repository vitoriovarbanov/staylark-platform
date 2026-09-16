import { loadModel } from './pricing.model.js';
import { pricingService } from './pricing.service.js';
import {
    pricingRulesRepository,
    type RuleCreateInput,
    type RuleListFilter,
    type RuleUpdateInput
} from '../repository/pricing-rules.repository.js';
import { db } from '../../../config/database.js';
import { AppError, ForbiddenError, NotFoundError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import type { PricingModelMetadata, PricingRule, PricingRulesListResponse } from '@staylark/contract';
import { Prisma, type PricingRuleType, type UserRole } from '@prisma/client';

const MODEL_RETRAIN_NOTE =
    'Coefficients are an output of training, not an editable setting — they aren’t exposed here.';

interface Viewer {
    id: string;
    role: UserRole;
}

const invalidateForRule = (propertyId: string | null) => {
    if (propertyId === null) pricingService.invalidateCache();
    else pricingService.invalidateCache(propertyId);
};

/**
 * Scope filter passed into the repository. Only managers reach these routes, so
 * the scope is always the caller's own portfolio.
 */
const scopeFor = (viewer: Viewer): string | undefined => viewer.id;

/**
 * Guards a mutation against the rule's scope:
 *   - global rule: 403 for everyone (see below).
 *   - unmanaged-property rule: 404 (info-hiding).
 *   - managed-property rule: pass.
 *
 * Global rules (propertyId null) apply across the whole portfolio and are no
 * longer editable through the app: a manager must not be able to reprice
 * properties they do not manage, and no role sits above them to undo it.
 * Existing rows stay in the database and keep applying as a read-only baseline;
 * changing one is a seed/developer operation.
 *
 * Ownership is checked at this exact moment, so a property transfer immediately
 * revokes access without a stale-scope window.
 */
const assertCanMutate = async (viewer: Viewer, rule: PricingRule): Promise<void> => {
    if (rule.propertyId === null) {
        throw new ForbiddenError('Global pricing rules cannot be modified.');
    }
    const owned = await pricingRulesRepository.propertyOwnedByAndAlive(rule.propertyId, viewer.id);
    if (!owned) throw new NotFoundError('Pricing rule not found');
};

export const pricingAdminService = {
    getModelMetadata: (): PricingModelMetadata => {
        const m = loadModel();
        return {
            modelVersion: m.modelVersion,
            trainedAt: m.trainedAt,
            dataSource: m.dataSource,
            rSquared: m.rSquared,
            note: MODEL_RETRAIN_NOTE
        };
    },

    listRules: async (
        viewer: Viewer,
        filter: {
            propertyId?: string;
            activeOn?: string;
            includeInactive: boolean;
            page: number;
            limit: number;
        }
    ): Promise<PricingRulesListResponse> => {
        const f: RuleListFilter = {
            propertyId: filter.propertyId,
            activeOn: filter.activeOn,
            includeInactive: filter.includeInactive,
            page: filter.page,
            limit: filter.limit,
            managerId: scopeFor(viewer)
        };
        const { data, total } = await pricingRulesRepository.list(f);
        return { data, total, page: filter.page, limit: filter.limit };
    },

    createRule: async (
        viewer: Viewer,
        input: {
            propertyId?: string | null;
            name: string;
            type: PricingRuleType;
            multiplier: number;
            startDate: string;
            endDate: string;
            isActive?: boolean;
            minNights?: number | null;
        }
    ): Promise<PricingRule> => {
        const propertyId = input.propertyId ?? null;

        if (propertyId === null) {
            throw new ForbiddenError('Global pricing rules cannot be created.');
        }

        const repoInput: RuleCreateInput = {
            propertyId,
            name: input.name,
            type: input.type,
            multiplier: input.multiplier,
            startDate: input.startDate,
            endDate: input.endDate,
            isActive: input.isActive ?? true,
            minNights: input.minNights ?? null
        };

        // Transaction wraps the ownership/existence check + insert so a
        // racing Property.managerId reassignment can't slip through between
        // the check and the create.
        const created = await db.$transaction(async tx => {
            const owned = await pricingRulesRepository.propertyOwnedByAndAlive(propertyId, viewer.id, tx);
            if (!owned) {
                throw new ForbiddenError('Cannot create rules for properties you do not manage.');
            }

            const row = await tx.pricingRule.create({
                data: {
                    propertyId,
                    name: repoInput.name,
                    type: repoInput.type,
                    multiplier: new Prisma.Decimal(repoInput.multiplier),
                    startDate: new Date(`${repoInput.startDate}T00:00:00.000Z`),
                    endDate: new Date(`${repoInput.endDate}T00:00:00.000Z`),
                    isActive: repoInput.isActive,
                    minNights: repoInput.minNights
                }
            });
            return {
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
            };
        });

        invalidateForRule(created.propertyId);

        logger.info(
            { userId: viewer.id, action: 'create', ruleId: created.id, before: null, after: created },
            'pricing.rule.create'
        );

        return created;
    },

    updateRule: async (viewer: Viewer, id: string, input: RuleUpdateInput): Promise<PricingRule> => {
        const before = await pricingRulesRepository.findById(id);
        if (!before) throw new NotFoundError('Pricing rule not found');

        await assertCanMutate(viewer, before);

        // Enforce the DURATION_DISCOUNT invariants on the *merged* rule. The Update
        // schema can only see the patch; the existing row matters too (e.g. flipping
        // type to DURATION_DISCOUNT while the stored minNights is null, or leaving a
        // stray minNights when changing away from it). Without this a PATCH could
        // persist a duration rule that silently never fires, or a discount that
        // raises the price.
        const mergedType = input.type ?? before.type;
        const mergedMinNights = input.minNights !== undefined ? input.minNights : before.minNights;
        const mergedMultiplier = input.multiplier ?? before.multiplier;
        if (mergedType === 'DURATION_DISCOUNT') {
            if (mergedMinNights == null) {
                throw new AppError('minNights is required for DURATION_DISCOUNT (>= 2)', 400);
            }
            if (mergedMultiplier >= 1) {
                throw new AppError('DURATION_DISCOUNT multiplier must be below 1 (a discount)', 400);
            }
        } else if (mergedMinNights != null) {
            throw new AppError('minNights only applies to DURATION_DISCOUNT rules', 400);
        }

        const after = await pricingRulesRepository.update(id, input);
        invalidateForRule(before.propertyId);
        if (after.propertyId !== before.propertyId) invalidateForRule(after.propertyId);

        logger.info({ userId: viewer.id, action: 'update', ruleId: id, before, after }, 'pricing.rule.update');

        return after;
    },

    deleteRule: async (viewer: Viewer, id: string): Promise<PricingRule> => {
        const before = await pricingRulesRepository.findById(id);
        if (!before) throw new NotFoundError('Pricing rule not found');

        await assertCanMutate(viewer, before);

        const after = await pricingRulesRepository.softDelete(id);
        invalidateForRule(before.propertyId);

        logger.info({ userId: viewer.id, action: 'delete', ruleId: id, before, after }, 'pricing.rule.delete');

        return after;
    }
};
