// client/src/App.jsx
import { useState } from 'react';
import { useDeviceSocket } from './useDeviceSocket';
import TemperatureChart from './TemperatureChart';
import ReadoutPanel from './ReadoutPanel';
import Controls from './Controls';

const UNIT_ID = 'ac-bedroom';   // Phase 1B: a single hard-coded unit

function App() {
  const { latest, history, status, sendCommand } = useDeviceSocket();

  // DESIRED state the user set via the controls. This is distinct from the ACTUAL
  // state in readings: a command is a request the simulation then converges toward.
  // power/mode aren't reported back in readings, so this desired state is client-only.
  const [desiredOn, setDesiredOn] = useState(true);   // default assumption; see report
  const [desiredTarget, setDesiredTarget] = useState(24);
  const [targetSeeded, setTargetSeeded] = useState(false);

  // Seed the target control once from the first real reading's setpoint, so the
  // control starts in sync with the simulation rather than guessing. This is the
  // "adjust state during render" pattern (guarded so it runs a single time), which
  // React prefers over a setState-in-effect.
  if (!targetSeeded && latest) {
    setDesiredTarget(latest.targetTemp);
    setTargetSeeded(true);
  }

  const disconnected = status === 'disconnected';
  const controlsDisabled = status !== 'connected';   // can't deliver a command otherwise

  // Every control action sends the COMPLETE declarative command. The single power
  // toggle maps to both power and mode (on -> cool, off -> idle); see report.
  const send = (on, targetTemp) => {
    sendCommand({
      unitId: UNIT_ID,
      power: on ? 'on' : 'off',
      mode: on ? 'cool' : 'idle',
      targetTemp,
    });
  };

  const handleTogglePower = () => {
    const next = !desiredOn;
    setDesiredOn(next);
    send(next, desiredTarget);
  };

  const handleTargetChange = (value) => {
    setDesiredTarget(value);
    send(desiredOn, value);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 40, margin: '0 0 8px' }}>Smart AC — {UNIT_ID}</h1>
      <p style={{ color: 'var(--text)', marginBottom: 24 }}>
        Live physics simulation. Values below are simulated, not from real hardware.
      </p>

      {/* Disconnected banner — controls are disabled while this shows. */}
      {disconnected && (
        <div
          style={{
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            color: '#dc2626',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 20,
          }}
        >
          Disconnected from the simulation — trying to reconnect. Controls are
          disabled until the connection is restored.
        </div>
      )}

      {/* Connecting state: before the socket's first connect, replace the dashboard
          with a simple message rather than a blank or broken chart. */}
      {status === 'connecting' ? (
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
          Connecting to simulation…
        </div>
      ) : (
        <>
          <TemperatureChart
            history={history}
            targetTemp={latest ? latest.targetTemp : undefined}
            status={status}
          />
          <div style={{ height: 28 }} />
          <ReadoutPanel reading={latest} />
          <div style={{ height: 28 }} />
          <Controls
            desiredOn={desiredOn}
            desiredTarget={desiredTarget}
            onTogglePower={handleTogglePower}
            onTargetChange={handleTargetChange}
            disabled={controlsDisabled}
          />
        </>
      )}
    </div>
  );
}

export default App;
