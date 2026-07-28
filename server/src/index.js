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

// Persist every reading. The recorder subscribes to the same reading stream the socket
// broadcast uses, via the driver's onReading contract — it holds no other coupling.
const recorder = new ReadingRecorder(driver);   // constructed for its subscription

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

// Connect to the database BEFORE the tick loop starts, so we never emit a reading we
// can't store. connectDB exits the process if the database is unreachable.
async function start() {
  await connectDB();

  driver.start();

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
