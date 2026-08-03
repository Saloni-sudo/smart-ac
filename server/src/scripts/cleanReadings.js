// server/src/scripts/cleanReadings.js
// ONE-OFF developer utility for clearing polluted readings. It is NOT part of the app
// and is deliberately not imported anywhere — run it by hand, on purpose.
//
// It deletes stored readings for exactly one unit, hard-coded below. There is no way to
// point it at another unit or at the whole collection without editing this file.
//
// Usage (from the server/ directory):
//   node src/scripts/cleanReadings.js             # dry run: count + sample, deletes nothing
//   node src/scripts/cleanReadings.js --confirm   # actually deletes
//
// Deleting is irreversible. Stop the server first — a running server keeps writing
// readings every tick, so anything deleted while it runs is immediately replaced.

require('dotenv').config();        // load MONGODB_URI from server/.env
const mongoose = require('mongoose');
const connectDB = require('../db/connect');
const Reading = require('../db/models/Reading');

// The ONLY unit this script will ever touch. Every query below is scoped to this id;
// there is no unfiltered delete anywhere in this file.
const TARGET_UNIT_ID = 'ac-bedroom';

const SAMPLE_SIZE = 5;             // how many timestamps to preview from each end

async function main() {
  // Nothing is deleted unless this flag is passed explicitly.
  const confirmed = process.argv.includes('--confirm');

  await connectDB();               // logs host only, never the URI; exits if unreachable

  // One scoped filter, reused for the count, the preview, and the delete — so what is
  // reported and what would be removed can never drift apart.
  const filter = { unitId: TARGET_UNIT_ID };

  const count = await Reading.countDocuments(filter);
  console.log(`\nReadings matching ${JSON.stringify(filter)}: ${count}`);

  if (count === 0) {
    console.log('Nothing to delete.');
    await mongoose.disconnect();
    return;
  }

  const oldest = await Reading.find(filter)
    .sort({ timestamp: 1 })
    .limit(SAMPLE_SIZE)
    .select('timestamp targetTemp acOn -_id')
    .lean();

  const newest = await Reading.find(filter)
    .sort({ timestamp: -1 })
    .limit(SAMPLE_SIZE)
    .select('timestamp targetTemp acOn -_id')
    .lean();

  const show = (label, rows) => {
    console.log(`\n${label}:`);
    rows.forEach((r) => {
      console.log(`  ${r.timestamp.toISOString()}  targetTemp=${r.targetTemp}  acOn=${r.acOn}`);
    });
  };

  show(`Oldest ${oldest.length} (simulated timestamps)`, oldest);
  show(`Newest ${newest.length} (simulated timestamps)`, newest.reverse());

  if (!confirmed) {
    console.log(`\nDRY RUN — nothing was deleted.`);
    console.log(`Would delete ${count} document(s) for unitId "${TARGET_UNIT_ID}".`);
    console.log(`Re-run with --confirm to delete them:`);
    console.log(`  node src/scripts/cleanReadings.js --confirm\n`);
    await mongoose.disconnect();
    return;
  }

  const result = await Reading.deleteMany(filter);   // scoped delete — never deleteMany({})
  console.log(`\nDeleted ${result.deletedCount} document(s) for unitId "${TARGET_UNIT_ID}".\n`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`cleanReadings failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
