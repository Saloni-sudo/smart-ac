// server/src/simulation/SimulationDriver.js
// A physics-backed DeviceDriver. It holds per-unit state, ticks on a real-time
// interval, advances each room through the thermal model in physics.js, runs a
// thermostat with hysteresis, and emits Readings. It sits BEHIND the DeviceDriver
// boundary: nothing above the boundary imports this file except the driver factory
// (the one composition-root that is allowed to know a concrete driver).

const DeviceDriver = require('../core/DeviceDriver');
const { stepRoom } = require('./physics');

// --- Timing ---------------------------------------------------------------

// How often, in real wall-clock time, a tick fires.
const TICK_INTERVAL_MS = 1000;

// Simulated seconds advanced per tick, passed to the physics as dt. This is a
// display/testing convenience so temperature change is visible over a short run;
// the physics itself is unchanged (it just receives a larger dt). This constant
// must NOT appear anywhere outside this file: real hardware runs at 1:1, so
// time-scaling is a simulation-only concern and must never cross the driver
// boundary.
const SIM_SECONDS_PER_TICK = 30;

// --- Control --------------------------------------------------------------

// Thermostat hysteresis half-width, °C. The compressor switches ON above
// targetTemp + deadband, OFF below targetTemp - deadband, and HOLDS its current
// state in between so it doesn't chatter on/off every tick.
const THERMOSTAT_DEADBAND_C = 0.5;

// --- Derived metrics ------------------------------------------------------

// Coefficient of performance, dimensionless. ASSUMED nominal value for the
// simulation — not a measured figure for any real unit. Used to derive electrical
// powerDraw from the thermal coolingPower: electrical W = cooling W / COP.
const COP = 3.0;

// Given the compressor's current state and the room, decide the next compressor
// state using deadband hysteresis. When the unit is not enabled (powered off or
// idle), the compressor is forced off.
function thermostat(currentAcOn, roomTemp, targetTemp, enabled) {
  if (!enabled) return false;                                  // off/idle → compressor off
  if (roomTemp > targetTemp + THERMOSTAT_DEADBAND_C) return true;  // too warm → cool
  if (roomTemp < targetTemp - THERMOSTAT_DEADBAND_C) return false; // cool enough → stop
  return currentAcOn;                                          // within band → hold
}

class SimulationDriver extends DeviceDriver {
  constructor() {
    super();
    this.units = new Map();          // unitId -> per-unit simulation state
    this.readingCallbacks = [];      // subscribers registered via onReading
    this.timer = null;               // setInterval handle while running
  }

  // Register a unit to simulate. config carries the assumed physical parameters
  // and the initial/target temperatures; see the seed in index.js for units.
  addUnit(unitId, config) {
    this.units.set(unitId, {
      // physics parameters (assumed simulation values; units documented at seed)
      outsideTemp: config.outsideTemp,
      k: config.k,
      coolingPower: config.coolingPower,
      thermalMass: config.thermalMass,
      // live simulated state
      roomTemp: config.startTemp,
      acOn: false,                   // compressor state; reconciled on the first tick
      // desired state (what commands reconcile toward)
      targetTemp: config.targetTemp,
      power: 'on',                   // default desired state: powered on...
      mode: 'cool',                  // ...and cooling, so the sim does something visible
      // per-unit simulated clock, advanced by SIM_SECONDS_PER_TICK each tick
      simClockMs: Date.now(),
    });
  }

  // --- DeviceDriver interface ---------------------------------------------

  onReading(cb) {
    this.readingCallbacks.push(cb);
  }

  // Declarative desired-state command. Only the fields present are applied, and
  // applying the same command twice is a no-op (identical writes). Invalid values
  // are ignored rather than corrupting state.
  sendCommand(unitId, command) {
    const unit = this.units.get(unitId);
    if (!unit || !command) return;

    if (command.power === 'on' || command.power === 'off') {
      unit.power = command.power;
    }
    if (command.mode === 'cool' || command.mode === 'idle') {
      unit.mode = command.mode;
    }
    if (typeof command.targetTemp === 'number' && Number.isFinite(command.targetTemp)) {
      unit.targetTemp = command.targetTemp;
    }
  }

  start() {
    if (this.timer) return;          // already running — do not stack intervals
    this.timer = setInterval(() => this._tick(), TICK_INTERVAL_MS);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  // --- Internals ----------------------------------------------------------

  _tick() {
    for (const [unitId, unit] of this.units) {
      // advance this unit's simulated clock
      unit.simClockMs += SIM_SECONDS_PER_TICK * 1000;

      // reconcile the compressor toward the desired state (thermostat + deadband)
      const enabled = unit.power === 'on' && unit.mode === 'cool';
      unit.acOn = thermostat(unit.acOn, unit.roomTemp, unit.targetTemp, enabled);

      // advance the physics one simulated timestep
      const next = stepRoom(
        { roomTemp: unit.roomTemp, acOn: unit.acOn },
        {
          outsideTemp: unit.outsideTemp,
          k: unit.k,
          coolingPower: unit.coolingPower,
          thermalMass: unit.thermalMass,
        },
        SIM_SECONDS_PER_TICK
      );
      unit.roomTemp = next.roomTemp;

      // powerDraw is DERIVED from the physics, never invented: electrical watts =
      // cooling watts / COP while running, and 0 while off.
      const powerDraw = unit.acOn ? unit.coolingPower / COP : 0;

      this._emitReading({
        unitId,
        roomTemp: unit.roomTemp,
        targetTemp: unit.targetTemp,
        acOn: unit.acOn,
        outsideTemp: unit.outsideTemp,
        powerDraw,
        timestamp: new Date(unit.simClockMs).toISOString(),
      });
    }
  }

  _emitReading(reading) {
    for (const cb of this.readingCallbacks) cb(reading);
  }
}

module.exports = SimulationDriver;
