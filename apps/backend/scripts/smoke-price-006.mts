// PRICE-006 smoke probe — service-layer end-to-end:
//
// 1. Assigns Sofia property to seeded MANAGER (idempotent)
// 2. Asserts ADMIN sees ALL rules (managed + unmanaged + globals)
// 3. Asserts MANAGER sees only managed-property rules + globals (no Bansko rule)
// 4. Asserts MANAGER list `?propertyId=<unmanaged>` returns empty
// 5. Asserts MANAGER createRule on own property succeeds
// 6. Asserts MANAGER createRule on unmanaged property → 403
// 7. Asserts MANAGER createRule global → 403
// 8. Asserts MANAGER updateRule on global → 403
// 9. Asserts MANAGER updateRule on unmanaged → 404
// 10. Cleans up rules it created
//
// Run: pnpm --filter @staylark/backend tsx scripts/smoke-price-006.mts

import { pricingAdminService } from '../src/routes/pricing/service/pricing-admin.service.js';
import { db } from '../src/config/database.js';
import { AppError } from '../src/utils/errors.js';

const MANAGER_ID = '00000000-0000-4000-a000-000000000002';
const ADMIN_ID = '00000000-0000-4000-a000-000000000003';
const SOFIA_ID = '00000000-0000-4000-b000-000000000001'; // assigned to MANAGER below
const BANSKO_ID = '00000000-0000-4000-b000-000000000002'; // unmanaged by MANAGER

const ADMIN = { id: ADMIN_ID, role: 'ADMIN' as const };
const MANAGER = { id: MANAGER_ID, role: 'MANAGER' as const };

const DATE_RANGE = { startDate: '2030-01-01', endDate: '2030-12-31' };

function fail(msg: string): never {
    throw new Error(`SMOKE FAIL: ${msg}`);
}

async function expectThrow(label: string, expectedStatus: number, fn: () => Promise<unknown>): Promise<void> {
    try {
        await fn();
        fail(`${label}: expected throw with status ${expectedStatus}, but call succeeded`);
    } catch (e) {
        if (!(e instanceof AppError) || e.statusCode !== expectedStatus) {
            const got = e instanceof AppError ? `AppError(${e.statusCode}, "${e.message}")` : String(e);
            fail(`${label}: expected AppError(${expectedStatus}), got ${got}`);
        }
        console.log(`  ✓ ${label} → ${expectedStatus} (${(e as AppError).message})`);
    }
}

console.log('PRICE-006 smoke — manager scoping for pricing overrides\n');

// ── Setup ─────────────────────────────────────────────────────
console.log('Setup: assigning Sofia property to MANAGER…');
await db.property.update({ where: { id: SOFIA_ID }, data: { managerId: MANAGER_ID } });
await db.property.update({ where: { id: BANSKO_ID }, data: { managerId: null } });

// Seed three rules as ADMIN so we can probe visibility.
const sofiaRule = await pricingAdminService.createRule(ADMIN, {
    propertyId: SOFIA_ID,
    name: 'PRICE-006 smoke sofia',
    type: 'SEASONAL',
    multiplier: 1.1,
    ...DATE_RANGE
});
const banskoRule = await pricingAdminService.createRule(ADMIN, {
    propertyId: BANSKO_ID,
    name: 'PRICE-006 smoke bansko',
    type: 'SEASONAL',
    multiplier: 1.1,
    ...DATE_RANGE
});
const globalRule = await pricingAdminService.createRule(ADMIN, {
    propertyId: null,
    name: 'PRICE-006 smoke global',
    type: 'DEMAND',
    multiplier: 1.05,
    ...DATE_RANGE
});

const cleanup = async () => {
    console.log('\nCleanup: removing test rules…');
    await db.pricingRule.deleteMany({
        where: { id: { in: [sofiaRule.id, banskoRule.id, globalRule.id] } }
    });
};

try {
    // ── 1. ADMIN sees everything ──────────────────────────────
    console.log('\nADMIN visibility:');
    const adminList = await pricingAdminService.listRules(ADMIN, {
        includeInactive: true,
        page: 1,
        limit: 200
    });
    const adminIds = new Set(adminList.data.map(r => r.id));
    if (!adminIds.has(sofiaRule.id) || !adminIds.has(banskoRule.id) || !adminIds.has(globalRule.id)) {
        fail(`ADMIN list missing rule(s). Got ${adminList.data.length} rules.`);
    }
    console.log(`  ✓ ADMIN sees all 3 seeded rules (sofia, bansko, global)`);

    // ── 2. MANAGER sees managed + globals, NOT unmanaged ─────
    console.log('\nMANAGER visibility:');
    const mgrList = await pricingAdminService.listRules(MANAGER, {
        includeInactive: true,
        page: 1,
        limit: 200
    });
    const mgrIds = new Set(mgrList.data.map(r => r.id));
    if (!mgrIds.has(sofiaRule.id)) fail('MANAGER list missing own Sofia rule');
    if (!mgrIds.has(globalRule.id)) fail('MANAGER list missing global rule (should be read-only visible)');
    if (mgrIds.has(banskoRule.id)) fail('MANAGER list LEAKED unmanaged Bansko rule');
    console.log(`  ✓ MANAGER sees Sofia + global; Bansko hidden`);

    // ── 3. MANAGER ?propertyId=unmanaged → empty list ─────────
    const mgrUnmanagedFilter = await pricingAdminService.listRules(MANAGER, {
        propertyId: BANSKO_ID,
        includeInactive: true,
        page: 1,
        limit: 200
    });
    if (mgrUnmanagedFilter.data.length !== 0) {
        fail(`MANAGER ?propertyId=bansko returned ${mgrUnmanagedFilter.data.length} rule(s) — should be empty`);
    }
    console.log(`  ✓ MANAGER ?propertyId=<unmanaged> returns [] (no 403, no leak)`);

    // ── 4. MANAGER createRule paths ───────────────────────────
    console.log('\nMANAGER create:');
    const mgrOwn = await pricingAdminService.createRule(MANAGER, {
        propertyId: SOFIA_ID,
        name: 'PRICE-006 smoke mgr-own',
        type: 'SEASONAL',
        multiplier: 0.95,
        ...DATE_RANGE
    });
    console.log(`  ✓ MANAGER create on own property → ${mgrOwn.id}`);
    // Track for cleanup
    await db.pricingRule.delete({ where: { id: mgrOwn.id } });

    await expectThrow('MANAGER create on unmanaged property', 403, () =>
        pricingAdminService.createRule(MANAGER, {
            propertyId: BANSKO_ID,
            name: 'PRICE-006 smoke mgr-unmanaged',
            type: 'SEASONAL',
            multiplier: 0.95,
            ...DATE_RANGE
        })
    );

    await expectThrow('MANAGER create global', 403, () =>
        pricingAdminService.createRule(MANAGER, {
            propertyId: null,
            name: 'PRICE-006 smoke mgr-global',
            type: 'SEASONAL',
            multiplier: 0.95,
            ...DATE_RANGE
        })
    );

    // ── 5. MANAGER updateRule paths ───────────────────────────
    console.log('\nMANAGER update:');
    await expectThrow('MANAGER update global rule', 403, () =>
        pricingAdminService.updateRule(MANAGER, globalRule.id, { name: 'hacked' })
    );

    await expectThrow('MANAGER update unmanaged rule', 404, () =>
        pricingAdminService.updateRule(MANAGER, banskoRule.id, { name: 'hacked' })
    );

    const mgrUpdated = await pricingAdminService.updateRule(MANAGER, sofiaRule.id, {
        name: 'PRICE-006 smoke sofia (updated)'
    });
    if (mgrUpdated.name !== 'PRICE-006 smoke sofia (updated)') fail('MANAGER update on own rule did not persist');
    console.log(`  ✓ MANAGER update on own rule succeeded`);

    // ── 6. MANAGER deleteRule paths ───────────────────────────
    console.log('\nMANAGER delete:');
    await expectThrow('MANAGER delete global rule', 403, () => pricingAdminService.deleteRule(MANAGER, globalRule.id));

    await expectThrow('MANAGER delete unmanaged rule', 404, () =>
        pricingAdminService.deleteRule(MANAGER, banskoRule.id)
    );

    const mgrDeleted = await pricingAdminService.deleteRule(MANAGER, sofiaRule.id);
    if (mgrDeleted.isActive) fail('MANAGER delete on own rule did not soft-delete');
    console.log(`  ✓ MANAGER delete (soft) on own rule succeeded`);

    console.log('\n✓ All PRICE-006 smoke assertions passed');
} finally {
    await cleanup();
    await db.$disconnect();
}
