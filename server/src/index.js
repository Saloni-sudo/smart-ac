// server/src/index.js
require('dotenv').config();        // load settings from .env into process.env
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const createDriver = require('./core/driverFactory');
const DeviceManager = require('./core/DeviceManager');
const connectDB = require('./db/connect');
const ReadingRecorder = require('./persistence/ReadingRecorder');
const readingsRouter = require('./routes/readings');

const app = express();
app.use(cors());                    // allow the browser front-end to call this server
app.use(express.json());            // let the server understand JSON in requests

const PORT = process.env.PORT || 4000;   // use the host's port if given, else 4000

// Socket.io must NOT use origin:"*". Allow local dev plus one configured origin.
const allowedOrigins = ['http://localhost:5173'];             // Vite dev server
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);             // deployed frontend origin
}

// Accepted setpoint range for an incoming command. Mirrors the client control
// bounds; assumed simulation limits, not a spec for any real thermostat.
const MIN_TARGET_C = 18;   // °C — assumed minimum allowed setpoint (sim value)
const MAX_TARGET_C = 30;   // °C — assumed maximum allowed setpoint (sim value)

app.get('/api/hello', (req, res) => {
  res.json({ message: 'hello from the server' });
});

// Read-only history endpoints. Mounted after /api/hello, which is untouched.
app.use('/api/readings', readingsRouter);

// One HTTP server carries both Express and Socket.io.
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// Build the device stack: a driver (chosen by env) behind the DeviceManager.
const driver = createDriver();
const manager = new DeviceManager(driver);

// The reading recorder is attached later, inside start(), and only once the port is
// ours and the database is up — see the ordering note there.

// Seed one simulated unit. Every value here is an ASSUMED simulation value, not a
// measured figure for any real room or AC.
driver.addUnit('ac-bedroom', {
  outsideTemp: 38,     // °C   — assumed outdoor temperature (sim value, not measured)
  k: 150,              // W/°C — assumed envelope heat-transfer coefficient (sim value)
  coolingPower: 3500,  // W    — assumed AC cooling capacity (sim value)
  thermalMass: 200000, // J/°C — assumed room thermal mass / heat capacity (sim value)
  startTemp: 30,       // °C   — assumed initial room temperature (sim value)
  targetTemp: 24,      // °C   — assumed thermostat setpoint (sim value)
});

// Broadcast every Reading to all connected clients on the `reading` event.
driver.onReading((reading) => {
  io.emit('reading', reading);
});

io.on('connection', (socket) => {
  // Accept declarative desired-state Commands and reconcile via the manager. A
  // rejected command is logged with one clear line saying what was rejected and
  // why, instead of being silently dropped.
  socket.on('command', (command) => {
    if (!command || !command.unitId) {
      console.warn(`Rejected command: missing unitId (received ${JSON.stringify(command)})`);
      return;
    }
    const { unitId, power, mode, targetTemp } = command;
    if (power !== 'on' && power !== 'off') {
      console.warn(`Rejected command for ${unitId}: invalid power ${JSON.stringify(power)} (expected "on" or "off")`);
      return;
    }
    if (mode !== 'cool' && mode !== 'idle') {
      console.warn(`Rejected command for ${unitId}: invalid mode ${JSON.stringify(mode)} (expected "cool" or "idle")`);
      return;
    }
    if (typeof targetTemp !== 'number' || !Number.isFinite(targetTemp) ||
        targetTemp < MIN_TARGET_C || targetTemp > MAX_TARGET_C) {
      console.warn(`Rejected command for ${unitId}: targetTemp ${JSON.stringify(targetTemp)} out of range ${MIN_TARGET_C}-${MAX_TARGET_C} °C`);
      return;
    }
    manager.sendCommand(unitId, command);
  });
});

// Claim the port before touching anything else. A duplicate launch (port already taken)
// must exit here — before any database connection exists — so it cannot write a single
// reading. Resolves only once this process owns the port.
function listenOrExit() {
  return new Promise((resolve) => {
    const onError = (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} already in use — is the server already running? Exiting without writing.`
        );
      } else {
        console.error(`Server failed to start: ${err.message}`);
      }
      process.exit(1);                 // nothing has connected to the database yet
    };

    server.once('error', onError);
    server.listen(PORT, () => {
      server.off('error', onError);    // startup succeeded; this guard no longer applies
      console.log(`Server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

// Startup order matters:
//   1. bind the port   — a doomed second instance dies here, having written nothing
//   2. connect the DB  — still fails loud and exits if the database is unreachable
//   3. attach recorder — the only thing that writes readings
//   4. start the driver — nothing ticks, emits, or is stored before this point
async function start() {
  await listenOrExit();
  await connectDB();

  new ReadingRecorder(driver);   // subscribes to the driver's reading stream

  driver.start();
}

start();
