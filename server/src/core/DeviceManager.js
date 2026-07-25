// server/src/core/DeviceManager.js
// Application-level device state. Subscribes to a driver's Reading stream, keeps the
// latest Reading per unit in memory, and forwards Commands. It depends ONLY on the
// DeviceDriver interface (received via the constructor) — it never imports or names
// any concrete driver. That is what lets us swap to real hardware by writing one new
// driver class and changing nothing here.

class DeviceManager {
  // driver: any object implementing the DeviceDriver contract.
  constructor(driver) {
    this.driver = driver;
    this.latest = new Map();         // unitId -> most recent Reading

    this.driver.onReading((reading) => {
      this.latest.set(reading.unitId, reading);
    });
  }

  // Most recent Reading for a unit, or null if none seen yet.
  getLatest(unitId) {
    return this.latest.get(unitId) || null;
  }

  // Forward a declarative Command to the driver.
  sendCommand(unitId, cmd) {
    this.driver.sendCommand(unitId, cmd);
  }
}

module.exports = DeviceManager;
