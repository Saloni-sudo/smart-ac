// server/src/simulation/physics.js
// Pure, deterministic lumped-capacitance thermal model for one room.
// No randomness, no I/O, no time — just physics. Given the current state and
// a timestep, it returns the next state. This is the only place the temperature
// equation lives; everything above the DeviceDriver boundary treats it as a
// black box.

// stepRoom(state, params, dt) -> new state (never mutates its inputs)
//
//   state.roomTemp   current room air temperature, °C
//   state.acOn       whether the compressor is currently cooling (boolean)
//
//   params.outsideTemp   outdoor temperature, °C
//   params.k             envelope heat-transfer coefficient, W/°C
//   params.coolingPower  heat the AC removes while running, W
//   params.thermalMass   room thermal mass (heat capacity), J/°C
//
//   dt                   timestep, seconds
//
// Model: a single lumped thermal node. Heat leaks in from outside in proportion
// to the temperature difference; the AC removes a fixed power while on. The net
// power divided by thermal mass gives the rate of temperature change.
function stepRoom(state, params, dt) {
  const { roomTemp, acOn } = state;
  const { outsideTemp, k, coolingPower, thermalMass } = params;

  const heatGain = k * (outsideTemp - roomTemp);   // W flowing in through the envelope
  const heatRemoved = acOn ? coolingPower : 0;      // W removed by the AC while running
  const deltaTemp = ((heatGain - heatRemoved) / thermalMass) * dt; // °C change over dt

  return { ...state, roomTemp: roomTemp + deltaTemp };
}

module.exports = { stepRoom };
