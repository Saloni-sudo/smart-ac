// server/src/routes/readings.js
// Read-only HTTP surface over stored readings. Thin on purpose: it validates input,
// calls into db/queries.js, and shapes the response. No query logic lives here, and
// nothing in this file writes to the database.

const express = require('express');
const {
  getHistory, getEvents, MAX_HOURS, DEFAULT_HOURS, EVENT_CATEGORIES,
} = require('../db/queries');

const router = express.Router();

// Validate the query parameters both routes share.
// Returns { unitId, hours } on success, or { error } describing what was wrong.
function parseParams(query) {
  const { unitId, hours } = query;

  if (typeof unitId !== 'string' || unitId.trim() === '') {
    return { error: 'unitId is required and must be a non-empty string' };
  }

  let parsedHours = DEFAULT_HOURS;
  if (hours !== undefined) {
    if (typeof hours !== 'string') {
      return { error: 'hours must be a single numeric value' };
    }
    parsedHours = Number(hours);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      return { error: 'hours must be a positive number' };
    }
    // Cap rather than reject; the response echoes the window actually used.
    if (parsedHours > MAX_HOURS) parsedHours = MAX_HOURS;
  }

  return { unitId: unitId.trim(), hours: parsedHours };
}

// Validate the optional category filter (events route only). Absent means 'all'.
function parseCategory(value) {
  if (value === undefined) return { category: 'all' };
  if (typeof value !== 'string' || !EVENT_CATEGORIES.includes(value)) {
    return { error: `category must be one of: ${EVENT_CATEGORIES.join(', ')}` };
  }
  return { category: value };
}

// GET /api/readings/history?unitId=<id>&hours=<n>
// Downsampled trend points. Every point is a real stored reading.
router.get('/history', async (req, res) => {
  const params = parseParams(req.query);
  if (params.error) return res.status(400).json({ error: params.error });

  try {
    res.json(await getHistory(params.unitId, params.hours));
  } catch (err) {
    console.warn(`GET /api/readings/history failed: ${err.message}`);
    res.status(500).json({ error: 'Could not read stored readings' });
  }
});

// GET /api/readings/events?unitId=<id>&hours=<n>&category=<all|user|system>
// Activity log derived strictly from real transitions between consecutive readings.
// `category` narrows what is returned; it never changes how events are detected.
// The response also carries `systemSummary`: per-simulated-hour counts of the thermostat's
// own on/off transitions, computed over the whole window before filtering and capping.
router.get('/events', async (req, res) => {
  const params = parseParams(req.query);
  if (params.error) return res.status(400).json({ error: params.error });

  const filter = parseCategory(req.query.category);
  if (filter.error) return res.status(400).json({ error: filter.error });

  try {
    res.json(await getEvents(params.unitId, params.hours, filter.category));
  } catch (err) {
    console.warn(`GET /api/readings/events failed: ${err.message}`);
    res.status(500).json({ error: 'Could not read stored readings' });
  }
});

module.exports = router;
