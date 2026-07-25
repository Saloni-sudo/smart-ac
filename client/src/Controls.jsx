// client/src/Controls.jsx
// The user's DESIRED state. These controls are a request: each change sends a full
// declarative Command, and the simulation converges toward it (watch the room card /
// reference line catch up). Kept visually separate from the "actual" room card so
// it's clear the two can differ mid-convergence. Disabled while disconnected, since a
// command can't be delivered then.

const MIN_TARGET_C = 18;   // °C — lowest setpoint the UI allows (matches backend validation)
const MAX_TARGET_C = 30;   // °C — highest setpoint the UI allows (matches backend validation)

function Controls({ desiredOn, desiredTarget, onTogglePower, onTargetChange, disabled }) {
  return (
    <section className={disabled ? 'card is-disabled' : 'card'}>
      <h2 className="section-title">Controls</h2>

      <div className="controls-row">
        <button
          type="button"
          className={desiredOn ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
          onClick={onTogglePower}
          disabled={disabled}
        >
          Power: {desiredOn ? 'ON' : 'OFF'} · tap to turn {desiredOn ? 'off' : 'on'}
        </button>

        <label className="slider">
          <span className="slider__label">Target</span>
          <input
            type="range"
            min={MIN_TARGET_C}
            max={MAX_TARGET_C}
            step={1}
            value={desiredTarget}
            disabled={disabled}
            onChange={(e) => onTargetChange(Number(e.target.value))}
          />
          <span className="slider__value">{desiredTarget} °C</span>
        </label>
      </div>

      <p className="note">
        This is the state you're requesting. The simulation converges toward it — the
        room card above shows what's actually happening.
      </p>
    </section>
  );
}

export default Controls;
