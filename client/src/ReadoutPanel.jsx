// client/src/ReadoutPanel.jsx
// Shows the ACTUAL live state from the latest reading: room temperature, the
// setpoint the simulation is currently using, whether the compressor is on, and
// the (simulated) electrical power draw. Every value here traces back to a real
// reading — nothing is invented. No savings/cost/efficiency numbers.

const cell = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '12px 16px',
  minWidth: 140,
  textAlign: 'left',
};
const labelStyle = { fontSize: 13, color: 'var(--text)', margin: 0 };
const valueStyle = { fontSize: 26, color: 'var(--text-h)', margin: '4px 0 0' };

function ReadoutPanel({ reading }) {
  // Before the first reading, show dashes rather than made-up numbers.
  const roomTemp = reading ? `${reading.roomTemp.toFixed(1)} °C` : '—';
  const targetTemp = reading ? `${reading.targetTemp} °C` : '—';
  const acOn = reading ? reading.acOn : null;
  const powerDraw = reading ? `${Math.round(reading.powerDraw)} W` : '—';

  return (
    <div>
      <h2 style={{ textAlign: 'left', marginBottom: 12 }}>Live readings (actual)</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={cell}>
          <p style={labelStyle}>Room temp</p>
          <p style={valueStyle}>{roomTemp}</p>
        </div>
        <div style={cell}>
          <p style={labelStyle}>Setpoint (actual)</p>
          <p style={valueStyle}>{targetTemp}</p>
        </div>
        <div style={cell}>
          <p style={labelStyle}>AC</p>
          <p style={{ ...valueStyle, color: acOn ? '#1f9d55' : 'var(--text)' }}>
            {acOn === null ? '—' : acOn ? 'ON' : 'OFF'}
          </p>
        </div>
        <div style={cell}>
          <p style={labelStyle}>Power draw (simulated)</p>
          <p style={valueStyle}>{powerDraw}</p>
        </div>
      </div>
    </div>
  );
}

export default ReadoutPanel;
