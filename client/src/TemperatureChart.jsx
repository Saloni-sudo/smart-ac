// client/src/TemperatureChart.jsx
// Live line chart of roomTemp over simulated time for one unit, with a reference
// line at the current (actual) targetTemp. Plots ONLY the readings received over
// the socket — no smoothing, interpolation, or padding. Straight segments connect
// real points (type="linear"); each vertex is an actual reading.
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

// Format a simulated-time ISO string for an axis tick. This reads reading.timestamp
// only — it never calls Date.now(). new Date() here just parses an existing value.
const formatSimTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function TemperatureChart({ history, targetTemp, status }) {
  // Empty-history placeholder: a friendly message instead of an empty axis.
  if (history.length === 0) {
    return (
      <div
        style={{
          height: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text)',
        }}
      >
        {status === 'connected'
          ? 'Waiting for first reading…'
          : 'Connecting to simulation…'}
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={history} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatSimTime}
            minTickGap={40}
            tick={{ fill: 'var(--text)', fontSize: 12 }}
            label={{ value: 'Simulated time', position: 'insideBottom', offset: -12, fill: 'var(--text)' }}
          />
          <YAxis
            unit="°C"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text)', fontSize: 12 }}
            width={56}
          />
          <Tooltip
            labelFormatter={formatSimTime}
            formatter={(value) => [`${value.toFixed(2)} °C`, 'roomTemp']}
          />
          {typeof targetTemp === 'number' && (
            <ReferenceLine
              y={targetTemp}
              stroke="var(--accent)"
              strokeDasharray="4 4"
              label={{ value: `target ${targetTemp}°C`, fill: 'var(--accent)', fontSize: 12, position: 'right' }}
            />
          )}
          <Line
            type="linear"            // straight segments between real points — no smoothing
            dataKey="roomTemp"
            stroke="var(--text-h)"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 8 }}>
        Chart data comes from a physics simulation, not real hardware.
      </p>
    </div>
  );
}

export default TemperatureChart;
