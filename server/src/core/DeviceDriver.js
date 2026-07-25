// server/src/core/DeviceDriver.js
// The boundary interface. This is the ONLY contract application code (DeviceManager,
// index.js, and everything above it) is allowed to depend on. Concrete drivers
// (SimulationDriver today, a HardwareDriver/MQTT later) live behind this line and
// implement these four methods. Swapping to real hardware must mean writing one new
// subclass — never editing anything above this boundary.
//
// Contract:
//   onReading(cb)              register cb(reading) to be called for every Reading
//                              the driver produces. May be called by multiple
//                              subscribers.
//   sendCommand(unitId, cmd)   apply a declarative desired-state Command to a unit.
//   start()                    begin producing Readings.
//   stop()                     stop producing Readings and release resources.
//
// Data shapes (do not change):
//   Reading: { unitId, roomTemp, targetTemp, acOn, outsideTemp, powerDraw, timestamp }
//   Command: { unitId, power: "on"|"off", targetTemp, mode: "cool"|"idle" }
class DeviceDriver {
  // Register a callback invoked once per Reading.
  onReading(cb) {}

  // Apply a declarative Command (desired state) to a unit. Idempotent by contract.
  sendCommand(unitId, command) {}

  // Start producing Readings.
  start() {}

  // Stop producing Readings.
  stop() {}
}

module.exports = DeviceDriver;
