// client/src/Controls.jsx
// The user's DESIRED state. These controls are a request: each change sends a full
// declarative Command, and the simulation converges toward it (watch the readout /
// reference line catch up). Visually kept separate from the "actual" readout so it's
// clear the two can differ mid-convergence. Disabled while disconnected, since a
// command can't be delivered then.

const MIN_TARGET_C = 18;   // °C — lowest setpoint the UI allows (matches backend validation)
const MAX_TARGET_C = 30;   // °C — highest setpoint the UI allows (matches backend validation)

function Controls({ desiredOn, desiredTarget, onTogglePower, onTargetChange, disabled }) {
  return (
    <div
      style={{
        border: '1px dashed var(--accent-border)',   // dashed = a request, not measured state
        borderRadius: 8,
        padding: 16,
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginBottom: 12 }}>Controls (desired state)</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onTogglePower}
          disabled={disabled}
          style={{
            fontSize: 16,
            padding: '8px 16px',
            borderRadius: 6,
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--text-h)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
          }}
        >
          Power: {desiredOn ? 'ON' : 'OFF'} (tap to turn {desiredOn ? 'off' : 'on'})
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
          Target °C
          <input
            type="range"
            min={MIN_TARGET_C}
            max={MAX_TARGET_C}
            step={1}
            value={desiredTarget}
            disabled={disabled}
            onChange={(e) => onTargetChange(Number(e.target.value))}
          />
          <span style={{ color: 'var(--text-h)', minWidth: 48 }}>{desiredTarget} °C</span>
        </label>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 12 }}>
        This is the state you're requesting. The simulation converges toward it — the
        live readings above show what's actually happening.
      </p>
    </div>
  );
}

export default Controls;
