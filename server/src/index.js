// server/src/index.js
require('dotenv').config();        // load settings from .env into process.env
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const createDriver = require('./core/driverFactory');
const DeviceManager = require('./core/DeviceManager');

const app = express();
app.use(cors());                    // allow the browser front-end to call this server
app.use(express.json());            // let the server understand JSON in requests

const PORT = process.env.PORT || 4000;   // use the host's port if given, else 4000

// Socket.io must NOT use origin:"*". Allow local dev plus one configured origin.
const allowedOrigins = ['http://localhost:5173'];             // Vite dev server
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);             // deployed frontend origin
}

app.get('/api/hello', (req, res) => {
  res.json({ message: 'hello from the server' });
});

// One HTTP server carries both Express and Socket.io.
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// Build the device stack: a driver (chosen by env) behind the DeviceManager.
const driver = createDriver();
const manager = new DeviceManager(driver);

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
  // Accept declarative desired-state Commands and reconcile via the manager.
  socket.on('command', (command) => {
    if (command && command.unitId) {
      manager.sendCommand(command.unitId, command);
    }
  });
});

driver.start();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
