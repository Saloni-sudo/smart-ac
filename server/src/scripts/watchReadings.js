// server/src/scripts/watchReadings.js
// THROWAWAY test client. Connects to the running server over socket.io and prints
// one line per Reading. Not part of the app — a manual sanity check for Phase 1A.
// Run the server, then: node src/scripts/watchReadings.js

const { io } = require('socket.io-client');

const PORT = process.env.PORT || 4000;
const url = `http://localhost:${PORT}`;

const socket = io(url);

socket.on('connect', () => {
  console.log(`connected to ${url} (${socket.id})`);
});

socket.on('reading', (r) => {
  console.log(r.timestamp, r.unitId, r.roomTemp.toFixed(2), r.acOn, r.powerDraw);
});

socket.on('connect_error', (err) => {
  console.error('connect_error:', err.message);
});
