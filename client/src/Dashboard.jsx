// client/src/Dashboard.jsx
// The live dashboard, moved here from App.jsx unchanged when routing was introduced.
// Socket logic, command flow, and the three connection states are exactly as before.
import { useState } from 'react';
import { useDeviceSocket } from './useDeviceSocket';
import TemperatureChart from './TemperatureChart';
import ReadoutPanel from './ReadoutPanel';
import Controls from './Controls';

const UNIT_ID = 'ac-bedroom';   // Phase 1B: a single hard-coded unit

function Dashboard() {
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
    <div className="page">
      <header className="page-header">
        <h1>Smart AC</h1>
        <p>Live physics simulation — values below are simulated, not from real hardware.</p>
      </header>

      {/* Disconnected banner — controls are disabled while this shows. */}
      {disconnected && (
        <div className="banner banner--danger">
          Disconnected from the simulation — trying to reconnect. Controls are
          disabled until the connection is restored.
        </div>
      )}

      {/* Connecting state: before the socket's first connect, replace the dashboard
          with a simple card rather than a blank or broken chart. */}
      {status === 'connecting' ? (
        <div className="card">
          <div className="placeholder">Connecting to simulation…</div>
        </div>
      ) : (
        <>
          <ReadoutPanel reading={latest} />
          <Controls
            desiredOn={desiredOn}
            desiredTarget={desiredTarget}
            onTogglePower={handleTogglePower}
            onTargetChange={handleTargetChange}
            disabled={controlsDisabled}
          />
          <TemperatureChart
            history={history}
            targetTemp={latest ? latest.targetTemp : undefined}
            status={status}
          />
        </>
      )}
    </div>
  );
}

export default Dashboard;
