// server/src/db/connect.js
// Opens the one shared MongoDB connection the server uses. Mongoose keeps a single
// internal connection pool, so every model required anywhere reuses this connection.
//
// If the database is unreachable we exit instead of running half-alive: a server that
// keeps streaming readings it cannot store would silently lose data and look healthy.

const mongoose = require('mongoose');

// How long to wait for a reachable database before giving up, in ms. Assumed
// operational value — short enough that a bad URI fails fast on deploy instead of
// hanging for the driver's 30 s default.
const SERVER_SELECTION_TIMEOUT_MS = 10000;

// A connection string must never reach the logs. Driver errors occasionally echo the
// URI back, so strip any "user:pass@" section before printing anything.
function redact(text) {
  return String(text).replace(/mongodb(\+srv)?:\/\/[^@\s]*@/gi, 'mongodb$1://<redacted>@');
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set — add it to server/.env (see server/.env.example).');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
    console.log(`MongoDB connected: ${conn.connection.host}`);   // host only — never the URI or credentials
  } catch (err) {
    console.error(`MongoDB connection failed: ${redact(err.message)}`);
    process.exit(1);                 // fail loud rather than run without persistence
  }
}

module.exports = connectDB;
