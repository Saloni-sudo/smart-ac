// server/src/core/driverFactory.js
// The composition root for device drivers. This is the ONE place allowed to import a
// concrete driver and decide which one to construct, based on process.env.DRIVER.
// Application code calls this factory and receives something typed as a DeviceDriver;
// it never sees the concrete class. Adding real hardware later means adding one case
// here and one new driver file — nothing above the boundary changes.

const SimulationDriver = require('../simulation/SimulationDriver');

function createDriver() {
  const driver = process.env.DRIVER;

  switch (driver) {
    case 'sim':
      return new SimulationDriver();
    default:
      throw new Error(
        `Unsupported DRIVER "${driver}". Only "sim" is supported today. ` +
          'Set DRIVER=sim in server/.env.'
      );
  }
}

module.exports = createDriver;
