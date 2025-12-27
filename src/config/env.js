const dotenv = require('dotenv');

dotenv.config();

const REQUIRED = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'CORS_ORIGIN'
];

function requireEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing required env vars:', missing.join(', '));
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}

function env(key, fallback = undefined) {
  const v = process.env[key];
  return (v === undefined || v === null || v === '') ? fallback : v;
}

module.exports = {
  requireEnv,
  env
};
