// src/server.js

const { app } = require('./app');
const { env } = require('./config/env');

const port = Number(env('PORT', 3000));

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[SERVIMEL] API running on http://localhost:${port}`);
});
