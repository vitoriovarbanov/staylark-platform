// Read-only data-gate check for real-data pricing retraining.
// Run against prod via the PUBLIC proxy URL (the backend's DATABASE_URL is the
// unreachable *.railway.internal host):
//   DATABASE_URL="$DATABASE_PUBLIC_URL" npx tsx scripts/_count-bookings.ts
import { countGateInputs } from './lib/gate-counts.js';
import { db } from '../src/config/database.js';

console.log(JSON.stringify(await countGateInputs(), null, 2));
await db.$disconnect();
