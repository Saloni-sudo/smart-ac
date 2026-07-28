// server/src/persistence/ReadingRecorder.js
// Persists every Reading the driver emits. It subscribes through the same `onReading`
// contract DeviceManager uses, so it depends only on the DeviceDriver interface — it
// never imports a concrete driver, and it never reaches into DeviceManager's internals.
//
// One reading, one document. No batching or buffering yet: at one tick per second per
// unit the write rate is trivial, and the simplest correct version is easiest to trust.

const Reading = require('../db/models/Reading');

class ReadingRecorder {
  // source: any object implementing the DeviceDriver reading stream (onReading).
  constructor(source) {
    this.source = source;
    this.source.onReading((reading) => this.record(reading));
  }

  // Fire-and-forget write. A failed write is logged and dropped — persistence must
  // never crash the tick loop or interrupt the socket broadcast.
  async record(reading) {
    try {
      await Reading.create({
        unitId: reading.unitId,
        roomTemp: reading.roomTemp,
        targetTemp: reading.targetTemp,
        acOn: reading.acOn,
        outsideTemp: reading.outsideTemp,
        powerDraw: reading.powerDraw,
        // Simulated time, parsed from the reading's own ISO timestamp. Never
        // Date.now(), never a fresh new Date() — the sim clock is the only clock.
        timestamp: new Date(reading.timestamp),
      });
    } catch (err) {
      console.warn(`Failed to store reading for ${reading.unitId}: ${err.message}`);
    }
  }
}

module.exports = ReadingRecorder;
