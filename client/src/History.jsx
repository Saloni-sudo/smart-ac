// client/src/History.jsx
// Activity history for one unit, read back from stored readings.
//
// Everything on this page is SIMULATED data. The chart plots real stored documents that
// the server downsampled by sampling — no averaging, interpolation, or smoothing happens
// on either side. The event log lists only transitions that actually occurred between
// two consecutive stored readings; it is never padded or invented.
//
// All times shown are simulated time, read from each reading's own timestamp. Nothing
// here calls Date.now(); new Date(...) is only ever used to parse a stored timestamp.
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

const UNIT_ID = 'ac-bedroom';   // single hard-coded unit, same as the dashboard
const WINDOW_HOURS = 24;        // simulated hours of history to request

// Parse a stored simulated timestamp for display. Never reads the wall clock.
const formatSimTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatSimDateTime = (iso) =>
  new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// A simulated-hour bucket label, e.g. "29 Jul, 10:30–11:30". Both ends are parsed from
// the bucket's own simulated timestamps; the wall clock is never consulted.
const formatSimHourRange = (startIso, endIso) =>
  `${formatSimDateTime(startIso)}–${new Date(endIso).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })}`;

// Describe the sampling using the returned points themselves: the median gap between
// consecutive simulated timestamps. Derived from the real data that arrived, so the
// simulator's internal tick rate never has to be known by the client.
function medianGapSeconds(points) {
  if (!points || points.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < points.length; i++) {
    gaps.push((new Date(points[i].timestamp) - new Date(points[i - 1].timestamp)) / 1000);
  }
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

// Render a gap as a readable phrase, dropping the "1" so it reads "per minute"
// rather than "per 1 min".
function describeGap(seconds) {
  if (seconds === null) return null;
  if (seconds < 60) {
    const s = Math.round(seconds);
    return s === 1 ? 'second' : `${s} s`;
  }
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return m === 1 ? 'minute' : `${m} min`;
  }
  const h = seconds / 3600;
  return h === 1 ? 'hour' : `${h.toFixed(1)} h`;
}

// Inline styles rather than new CSS classes: this change's scope is History.jsx only, so
// index.css is left untouched. Values come from the existing design tokens.
const toggleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-h)',
  marginBottom: 'var(--space-4)',
  cursor: 'pointer',
};

// Shared by both subheadings inside the Events card ("My changes" and "AC cycling"), so
// the two sections read as siblings rather than as two different kinds of thing.
const subheadingStyle = {
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  color: 'var(--text-h)',
  margin: 'var(--space-5) 0 var(--space-3)',
};

function History() {
  // One state object so loading / error / ready can never contradict each other.
  const [state, setState] = useState({ status: 'loading', history: null, events: null, error: null });

  // Off by default: the log shows the user's own changes, and automatic thermostat
  // cycling stays hidden until asked for. Hidden, never deleted.
  const [showSystem, setShowSystem] = useState(false);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    let cancelled = false;

    async function load() {
      try {
        const params = `unitId=${encodeURIComponent(UNIT_ID)}&hours=${WINDOW_HOURS}`;
        // Always ask for the user events. Filtering server-side matters: it applies
        // before the newest-N cap, so cycling can never crowd out real user changes.
        // Cycling itself is rendered from `systemSummary`, which the server computes
        // over the whole window regardless of this filter — so one request serves both,
        // and toggling is a pure display change with no refetch.
        const [historyRes, eventsRes] = await Promise.all([
          fetch(`${apiUrl}/api/readings/history?${params}`),
          fetch(`${apiUrl}/api/readings/events?${params}&category=user`),
        ]);

        if (!historyRes.ok || !eventsRes.ok) {
          throw new Error(`server responded ${historyRes.status} / ${eventsRes.status}`);
        }

        const [history, events] = await Promise.all([historyRes.json(), eventsRes.json()]);
        if (!cancelled) setState({ status: 'ready', history, events, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', history: null, events: null, error: err.message });
        }
      }
    }

    load();
    return () => { cancelled = true; };   // ignore a late response after unmount
  }, []);

  const header = (
    <header className="page-header">
      <h1>Activity history</h1>
      <p>
        Last {WINDOW_HOURS} hours of simulated time for {UNIT_ID}. All data on this page
        comes from a physics simulation, not real hardware.
      </p>
    </header>
  );

  if (state.status === 'loading') {
    return (
      <div className="page">
        {header}
        <div className="card">
          <div className="placeholder">Loading stored history…</div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="page">
        {header}
        <div className="banner banner--danger">
          Could not load history — {state.error}. The server may be offline or the
          database unreachable.
        </div>
      </div>
    );
  }

  const points = state.history.points;
  const events = state.events.events;
  const gap = describeGap(medianGapSeconds(points));
  // Fall back to an empty summary so an older backend can't break the page.
  const summary = state.events.systemSummary
    || { totalOn: 0, totalOff: 0, totalSystemEvents: 0, buckets: [] };

  return (
    <div className="page">
      {header}

      <section className="card chart-card">
        <h2 className="section-title">Room temperature</h2>

        {points.length === 0 ? (
          <div className="placeholder">No stored readings in this window yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatSimTime}
                minTickGap={40}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                label={{ value: 'Simulated time', position: 'insideBottom', offset: -12, fill: 'var(--muted)' }}
              />
              <YAxis
                unit="°C"
                domain={['auto', 'auto']}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                width={56}
              />
              <Tooltip
                labelFormatter={formatSimDateTime}
                formatter={(value) => [`${value.toFixed(2)} °C`, 'roomTemp']}
              />
              <Line
                type="linear"          // straight segments between real points — no smoothing
                dataKey="roomTemp"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {points.length > 0 && (
          <p className="note">
            Downsampled simulated data: showing {points.length.toLocaleString()} stored
            readings
            {state.history.sampledEvery > 1
              ? ` — every ${state.history.sampledEvery}${state.history.sampledEvery === 2 ? 'nd' : 'th'} reading`
              : ' — every stored reading'}
            {gap ? `, about 1 point per ${gap} of simulated time` : ''}. Each point is a real
            stored reading; nothing is averaged or interpolated.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Events</h2>

        <label style={toggleStyle}>
          <input
            type="checkbox"
            checked={showSystem}
            onChange={(e) => setShowSystem(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          Show AC cycling
          <span style={{ color: 'var(--muted)' }}>(automatic thermostat on/off)</span>
        </label>

        {/* Section 1 — the user's own actions. Always shown. */}
        <p style={subheadingStyle}>My changes</p>

        {events.length === 0 ? (
          // "You made no changes" is not the same as "nothing happened" — cycling is
          // summarised separately below, so this message only ever speaks to user events.
          <div className="placeholder">
            {showSystem
              ? 'No changes of yours in this window yet.'
              : 'No changes of yours in this window yet — automatic AC cycling is hidden.'}
          </div>
        ) : (
          <ul className="event-list">
            {events.map((event, i) => (
              <li className="event-item" key={`${event.timestamp}-${event.type}-${i}`}>
                <span className="event-time">{formatSimDateTime(event.timestamp)}</span>
                <span className="event-desc">{event.description}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="note">
          Newest first. Times are simulated, taken from the reading where the change was
          recorded. Events are derived only from real changes between consecutive stored
          readings.
          {!showSystem
            ? ' Automatic AC cycling is hidden here, not removed — tick the box to summarise it.'
            : ''}
          {state.events.truncated
            ? ` Showing the ${state.events.limit} most recent events.`
            : ''}
        </p>

        {/* Cycling is summarised per simulated hour rather than listed row by row: over a
            24-hour window the thermostat switches hundreds of times. Every one of those
            real transitions is counted here — on and off alike — and the individual events
            are still available from the API (category=all or category=system). */}
        {showSystem && (
          <>
            {/* Section 2 — the thermostat's own activity. Only shown when toggled on. */}
            <p style={subheadingStyle}>AC cycling, by simulated hour</p>

            {summary.totalSystemEvents === 0 ? (
              <div className="placeholder">No AC cycling in this window.</div>
            ) : (
              <>
                <ul className="event-list">
                  {summary.buckets.map((bucket) => (
                    <li className="event-item" key={bucket.hourStart}>
                      <span className="event-time">
                        {formatSimHourRange(bucket.hourStart, bucket.hourEnd)} (sim)
                      </span>
                      <span className="event-desc">
                        AC switched {bucket.cycleCount} times
                        <span style={{ color: 'var(--muted)' }}>
                          {' '}({bucket.onCount} on, {bucket.offCount} off)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="note">
                  AC switched {summary.totalSystemEvents} times in this window
                  ({summary.totalOn} on, {summary.totalOff} off). Hours are simulated-time
                  hours taken from each reading&rsquo;s timestamp, and only hours with
                  cycling are listed. Counts are real thermostat transitions, not estimates.
                </p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default History;
