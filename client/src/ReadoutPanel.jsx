// client/src/ReadoutPanel.jsx
// The hero "room card": shows the ACTUAL live state from the latest reading — the
// current room temperature as the large number, an AC on/off status pill, and the
// target + (simulated) power draw as smaller secondary text. Every value here traces
// back to a real reading — nothing is invented. No savings/cost/efficiency numbers.

const ROOM_NAME = 'Bedroom';   // presentational label for the single unit (ac-bedroom)

function ReadoutPanel({ reading }) {
  // Before the first reading, show dashes rather than made-up numbers.
  const roomTemp = reading ? reading.roomTemp.toFixed(1) : '—';
  const targetTemp = reading ? `${reading.targetTemp} °C` : '—';
  const acOn = reading ? reading.acOn : null;
  const powerDraw = reading ? `${Math.round(reading.powerDraw)} W` : '—';

  const acLabel = acOn === null ? '—' : acOn ? 'AC on' : 'AC off';

  return (
    <section className="card room-card">
      <div className="room-card__top">
        <div>
          <p className="eyebrow">Cooling</p>
          <h2 className="room-name">{ROOM_NAME}</h2>
        </div>
        <span className={acOn ? 'pill pill--on' : 'pill'}>
          <span className="pill__dot" />
          {acLabel}
        </span>
      </div>

      <div className="hero-temp">
        <span className="hero-temp__num">{roomTemp}</span>
        <span className="hero-temp__unit">°C</span>
      </div>

      <div className="secondary">
        <div>
          <p className="secondary__label">Target</p>
          <p className="secondary__value">{targetTemp}</p>
        </div>
        <div>
          <p className="secondary__label">Power draw (simulated)</p>
          <p className="secondary__value">{powerDraw}</p>
        </div>
      </div>
    </section>
  );
}

export default ReadoutPanel;
