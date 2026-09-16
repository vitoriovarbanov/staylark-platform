import { buildTicketNotifications } from '../src/services/email/ticket-notifications.js';

const TAG = '[smoke-ticket-notifications]';
let failures = 0;
function check(label: string, cond: boolean) {
    if (cond) console.log(`${TAG} ✓ ${label}`);
    else { console.error(`${TAG} ✗ ${label}`); failures++; }
}

const base = { id: 't1', propertyId: 'p1', category: 'NOISE', priority: 'HIGH', summary: 's' };
const assignee = { email: 'mgr@test.local', name: 'Manager A' };

// 1. Assigned → exactly one 'assigned' email to the assignee
const n1 = buildTicketNotifications({ ...base, assignedToId: 'u1' }, 'Bansko Loft', assignee);
check('assigned → 1 notification', n1.length === 1);
check('assigned → kind=assigned to assignee', n1[0]?.kind === 'assigned' && n1[0]?.to === 'mgr@test.local');

// 2. Null category → label becomes "Unclassified"
const n2 = buildTicketNotifications({ ...base, category: null, assignedToId: 'u1' }, 'X', assignee);
check('null category → "Unclassified" label', n2.every(n => n.category === 'Unclassified'));

// 3. Unassigned → no emails. The admin triage fan-out is retired: the property's
//    manager is the guaranteed fallback, so an unassigned ticket is only possible
//    for a legacy property with no manager at all.
const n3 = buildTicketNotifications({ ...base, assignedToId: null }, 'X', null);
check('unassigned → 0 notifications (no admin triage)', n3.length === 0);

// 4. Assigned but assignee lookup missing → no crash, no assigned email
const n4 = buildTicketNotifications({ ...base, assignedToId: 'u1' }, 'X', null);
check('assigned w/ missing assignee → 0 notifications', n4.length === 0);

if (failures) { console.error(`${TAG} FAIL — ${failures} assertion(s)`); process.exit(1); }
console.log(`${TAG} PASS`);
