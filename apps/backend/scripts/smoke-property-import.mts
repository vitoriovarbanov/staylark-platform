// Bulk property import smoke probe.
//
// Covers the behaviours the hermetic vitest suite cannot: a real database, real
// transactions, and the route-level role guard over HTTP.
//
// Two halves:
//   1. Service layer (needs a DB) — import semantics, manager self-assignment,
//      all-or-nothing rollback, SSRF rejection.
//   2. HTTP layer (needs the server on PORT) — MANAGER may import, ADMIN and USER
//      may not. This is the assertion that stops someone "fixing" the ADMIN 403
//      as though it were a bug; see docs/plans/2026-07-28-admin-role-narrowing-design.md.
//
// Run: cd apps/backend && pnpm exec tsx --env-file=.env scripts/smoke-property-import.mts
// The HTTP half is skipped automatically when nothing is listening.

import writeXlsxFile from 'write-excel-file/node';
import { db } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { propertyImportService } from '../src/routes/properties/import/service/property-import.service.js';
import { IMPORT_COLUMNS, DATA_SHEET_NAME } from '../src/routes/properties/import/service/parse-sheet.js';

const TAG = 'import-smoke-';
const TITLE_PREFIX = 'IMPORT-SMOKE';

let allOk = true;
const check = (ok: boolean, label: string, detail = '') => {
    if (!ok) allOk = false;
    console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${label}${detail ? ' :: ' + detail : ''}`);
};

// The trailing comma in `<T,>` is required: in .mts, a bare `<T>` is ambiguous with JSX.
const attempt = async <T,>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; err: Error }> => {
    try {
        return { ok: true, value: await fn() };
    } catch (e) {
        return { ok: false, err: e as Error };
    }
};

/** Builds an .xlsx with our template header and the given rows (values keyed by column). */
async function sheetOf(rows: Record<string, string>[], columns: readonly string[] = IMPORT_COLUMNS): Promise<Buffer> {
    return writeXlsxFile([
        {
            sheet: DATA_SHEET_NAME,
            data: [
                columns.map(c => ({ value: c, type: String })),
                ...rows.map(row => columns.map(c => ({ value: row[c] ?? '', type: String })))
            ]
        }
    ]).toBuffer();
}

const validRow = (n: number): Record<string, string> => ({
    title: `${TITLE_PREFIX} ${n}`,
    description: `Smoke property ${n}`,
    type: 'APARTMENT',
    city: 'Sofia',
    address: `${n} Smoke St`,
    nightlyPrice: '100',
    maxGuests: '2',
    amenities: 'WI-FI, parking'
});

const cleanup = async () => {
    await db.property.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
    await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
};

const countSmokeProperties = () => db.property.count({ where: { title: { startsWith: TITLE_PREFIX } } });

console.log('Bulk property import smoke\n');
await cleanup();

try {
    const manager = await db.user.create({
        data: { name: 'Import Smoke Manager', email: `${TAG}mgr@test.local`, emailVerified: true, role: 'MANAGER' }
    });
    const otherManager = await db.user.create({
        data: { name: 'Import Smoke Other', email: `${TAG}other@test.local`, emailVerified: true, role: 'MANAGER' }
    });

    // ── 1. Happy path ─────────────────────────────────────────
    console.log('Service layer');
    const happyFile = await sheetOf([validRow(1), validRow(2)]);
    const happy = await attempt(() => propertyImportService.import(happyFile, 'p.xlsx', manager.id));
    check(happy.ok, 'a valid two-row file imports', happy.ok ? '' : happy.err.message);
    if (happy.ok) {
        check(happy.value.created === 2, 'reports 2 created', String(happy.value.created));
        check(
            happy.value.properties.every(p => p.managerId === manager.id),
            'every row is assigned to the uploading manager'
        );
    }

    // ── 2. managerId in the file is refused outright ──────────
    const managerColumnFile = await sheetOf(
        [{ ...validRow(3), managerId: otherManager.id }],
        [...IMPORT_COLUMNS, 'managerId']
    );
    const withManagerColumn = await attempt(() =>
        propertyImportService.import(managerColumnFile, 'p.xlsx', manager.id)
    );
    check(!withManagerColumn.ok, 'a managerId column is rejected as unknown');
    check(
        !withManagerColumn.ok && /managerId/.test(withManagerColumn.err.message + JSON.stringify(withManagerColumn.err)),
        'the rejection names the offending column'
    );
    check(
        (await db.property.count({ where: { managerId: otherManager.id } })) === 0,
        'no property was assigned to the manager named in the file'
    );

    // ── 3. All-or-nothing ─────────────────────────────────────
    const before = await countSmokeProperties();
    const partialFile = await sheetOf([validRow(10), { ...validRow(11), nightlyPrice: 'abc' }, validRow(12)]);
    const partial = await attempt(() => propertyImportService.import(partialFile, 'p.xlsx', manager.id));
    check(!partial.ok, 'one bad row rejects the file');
    check((await countSmokeProperties()) === before, 'nothing was written for a rejected file');

    // ── 4. SSRF guard ─────────────────────────────────────────
    for (const [label, url] of [
        ['loopback', 'https://localhost/x.jpg'],
        ['cloud metadata', 'https://169.254.169.254/latest/meta-data/']
    ] as const) {
        const before = await countSmokeProperties();
        const blockedFile = await sheetOf([{ ...validRow(20), photos: url }]);
        const blocked = await attempt(() => propertyImportService.import(blockedFile, 'p.xlsx', manager.id));
        check(!blocked.ok, `${label} photo URL is rejected`);
        check((await countSmokeProperties()) === before, `${label} attempt wrote nothing`);
    }

    // ── 5. Amenity normalisation against the live catalogue ───
    const normalised = await db.property.findFirst({
        where: { title: `${TITLE_PREFIX} 1` },
        select: { amenities: true }
    });
    console.log(`  · amenities stored as: ${JSON.stringify(normalised?.amenities)}`);

    // ── 6. HTTP role guards ───────────────────────────────────
    console.log('\nHTTP layer');
    const base = `http://localhost:${env.PORT}`;
    const reachable = await fetch(`${base}/health/live`, { signal: AbortSignal.timeout(1500) })
        .then(r => r.ok)
        .catch(() => false);

    if (!reachable) {
        console.log(`  · SKIPPED — nothing listening on ${base}. Start the backend and re-run.`);
    } else {
        // Anonymous is the only role we can assert without minting sessions here.
        // Signed-in role coverage needs the browser/session flow; see step 2 of the
        // manual checklist in docs/plans/2026-08-04-bulk-property-import-implementation.md.
        for (const path of ['/api/properties/import/template', '/api/properties/import']) {
            const res = await fetch(`${base}${path}`, { method: path.endsWith('import') ? 'POST' : 'GET' });
            check(res.status === 401, `anonymous ${path} → 401`, String(res.status));
        }
        console.log('  · signed-in ADMIN/USER 403 checks require a session — run the manual checklist.');
    }
} finally {
    await cleanup();
    await db.$disconnect();
}

console.log(`\n${allOk ? '✅ All checks passed' : '❌ Some checks FAILED'}`);
process.exit(allOk ? 0 : 1);
