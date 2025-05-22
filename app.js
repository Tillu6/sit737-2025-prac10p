const express = require('express');
const os = require('os');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  // <-- Add this log line
  console.log(`Request received for / at ${new Date().toISOString()} from host ${os.hostname()}`);

  res.send(`
    <h1>Simple Node App</h1>
    <p>Hostname: ${os.hostname()}</p>
    <p>Uptime: ${Math.floor(os.uptime())} seconds</p>
  `);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
