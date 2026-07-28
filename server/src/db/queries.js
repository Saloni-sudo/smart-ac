// server/src/db/queries.js
// Read-only queries over stored readings. Nothing here writes, updates, or deletes.
//
// TIME: every window in this file is measured on the SIMULATED clock carried by each
// reading's `timestamp`. Nothing calls Date.now(). "The last N hours" is anchored to the
// newest stored reading for that unit, so it means N hours of simulated time — using
// wall-clock time here would be wrong, because simulated time runs at its own rate.

const Reading = require('./models/Reading');

const MAX_POINTS = 1500;      // most chart points a history response will return
const MAX_EVENTS = 200;       // most events an events response will return (newest kept)
const MAX_HOURS = 24;         // widest window we will scan, in simulated hours
const DEFAULT_HOURS = 24;     // window used when the caller doesn't ask for one

// Accepted values for the events category filter. 'user' = target changes (commanded),
// 'system' = acOn changes (thermostat deadband), 'all' = no filtering.
const EVENT_CATEGORIES = ['all', 'user', 'system'];

const MS_PER_HOUR = 60 * 60 * 1000;

// Return exactly the stored reading fields — no Mongo bookkeeping, nothing derived.
const READING_FIELDS = '-_id -__v';

// Resolve the [start, end] simulated-time window for a unit. `end` is the newest stored
// reading's own timestamp; `start` is `hours` of simulated time before it. Returns null
// when the unit has no stored readings at all.
async function resolveWindow(unitId, hours) {
  const newest = await Reading.findOne({ unitId })
    .sort({ timestamp: -1 })          // served by the { unitId, timestamp } index
    .select('timestamp')
    .lean();

  if (!newest) return null;

  const end = newest.timestamp;
  const start = new Date(end.getTime() - hours * MS_PER_HOUR);
  return { start, end };
}

// How many stored readings to step over between returned points so the response stays
// under maxPoints. Pure function.
function computeStride(count, maxPoints) {
  if (count <= maxPoints) return 1;
  return Math.ceil(count / maxPoints);
}

// Keep every Nth document. Sampling only: each element of the result IS one of the input
// documents, unmodified. Nothing is averaged, interpolated, smoothed, or synthesised.
function sampleEvery(docs, stride) {
  if (stride <= 1) return docs;
  const sampled = [];
  for (let i = 0; i < docs.length; i += stride) {
    sampled.push(docs[i]);
  }
  return sampled;
}

// Downsampled trend data for a unit over the last `hours` of simulated time.
async function getHistory(unitId, hours) {
  const window = await resolveWindow(unitId, hours);
  if (!window) return { unitId, hours, sampledEvery: 1, points: [] };

  const docs = await Reading.find({
    unitId,
    timestamp: { $gte: window.start, $lte: window.end },
  })
    .sort({ timestamp: 1 })           // ascending; served by the compound index
    .select(READING_FIELDS)
    .lean();

  const sampledEvery = computeStride(docs.length, MAX_POINTS);
  return { unitId, hours, sampledEvery, points: sampleEvery(docs, sampledEvery) };
}

// Derive an activity log from readings given in ascending time order.
//
// An event is emitted ONLY where a value actually differs from the immediately previous
// stored reading. The loop starts at index 1, so the first reading — which has no
// predecessor to compare against — never produces an event. Readings where nothing
// changed produce nothing. No event is padded, guessed, back-filled, or invented, and
// every event's timestamp is the real simulated timestamp of the reading where the
// change was observed.
function deriveEvents(readings) {
  const events = [];

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];

    if (curr.acOn !== prev.acOn) {
      events.push({
        type: 'ac',
        // The thermostat owns acOn and flips it automatically via the deadband, so an
        // acOn change is always thermostat-caused — never a direct user command.
        category: 'system',
        timestamp: curr.timestamp,
        acOn: curr.acOn,
        description: curr.acOn ? 'AC turned on' : 'AC turned off',
      });
    }

    if (curr.targetTemp !== prev.targetTemp) {
      events.push({
        type: 'target',
        // targetTemp only ever changes because a command was sent, so a target change
        // is user-caused.
        category: 'user',
        timestamp: curr.timestamp,
        targetTemp: curr.targetTemp,
        previousTargetTemp: prev.targetTemp,
        description: `Target set to ${curr.targetTemp}°C`,
      });
    }
  }

  return events;
}

// Derived event log for a unit over the last `hours` of simulated time, optionally
// narrowed to one category. Returns the newest MAX_EVENTS events, newest first, and says
// whether older ones were dropped. `category` filters which events are returned; it never
// changes how they are detected, and nothing is deleted — 'all' still returns everything.
async function getEvents(unitId, hours, category = 'all') {
  const window = await resolveWindow(unitId, hours);
  if (!window) return { unitId, hours, category, limit: MAX_EVENTS, truncated: false, events: [] };

  const docs = await Reading.find({
    unitId,
    timestamp: { $gte: window.start, $lte: window.end },
  })
    .sort({ timestamp: 1 })           // transitions only make sense in time order
    .select('acOn targetTemp timestamp -_id')
    .lean();

  const all = deriveEvents(docs);
  // Filter BEFORE capping, so frequent thermostat cycling can never push real user
  // events out of the newest-MAX_EVENTS window.
  const matching = category === 'all' ? all : all.filter((event) => event.category === category);
  const truncated = matching.length > MAX_EVENTS;
  const kept = truncated ? matching.slice(matching.length - MAX_EVENTS) : matching;  // newest

  return { unitId, hours, category, limit: MAX_EVENTS, truncated, events: kept.reverse() };
}

module.exports = {
  getHistory,
  getEvents,
  // exported for the routes and for direct testing of the pure logic
  computeStride,
  sampleEvery,
  deriveEvents,
  MAX_POINTS,
  MAX_EVENTS,
  MAX_HOURS,
  DEFAULT_HOURS,
  EVENT_CATEGORIES,
};
