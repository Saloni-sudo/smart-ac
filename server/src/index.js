// server/src/index.js
require('dotenv').config();        // load settings from .env into process.env
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());                    // allow the browser front-end to call this server
app.use(express.json());            // let the server understand JSON in requests

const PORT = process.env.PORT || 4000;   // use the host's port if given, else 4000

app.get('/api/hello', (req, res) => {
  res.json({ message: 'hello from the server' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});