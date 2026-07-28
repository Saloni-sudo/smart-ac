// server/src/db/models/Reading.js
// One document per Reading emitted by the driver. The fields mirror the Reading
// contract exactly — nothing is added, computed, or derived here.
//
// IMPORTANT: `timestamp` is SIMULATED time, taken from reading.timestamp. It is the
// project's only clock and is never wall-clock time. Mongoose's automatic
// `{ timestamps: true }` (createdAt / updatedAt) is deliberately NOT enabled, because
// those are Date.now() values and would introduce a second, conflicting notion of when
// a reading happened.

const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  unitId: { type: String, required: true, index: true },  // which unit produced this reading
  roomTemp: { type: Number, required: true },             // °C — room air temperature from the physics model
  targetTemp: { type: Number, required: true },           // °C — setpoint in force during that tick
  acOn: { type: Boolean, required: true },                // whether the compressor was running
  outsideTemp: { type: Number, required: true },          // °C — outdoor temperature used by the model
  powerDraw: { type: Number, required: true },            // W  — derived electrical draw (0 while off)
  timestamp: { type: Date, required: true },              // simulated time — see the note above
});

// History queries filter by unit and sort by time, so index that pair together.
readingSchema.index({ unitId: 1, timestamp: 1 });

module.exports = mongoose.model('Reading', readingSchema);
