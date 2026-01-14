// src/config/env.js
// ============================================================
// SERVIMEL — Env
// ✅ Soporta LOCAL (DB_*) y CLOUD (MYSQL_ADDON_* de Clever Cloud)
// ✅ requireEnv() valida que exista un set válido (no exige ambos)
// ✅ Mantiene CORS/JWT como obligatorios
// ============================================================

const dotenv = require('dotenv');

dotenv.config();

// Requeridos siempre
const REQUIRED_ALWAYS = ['JWT_SECRET', 'CORS_ORIGIN'];

// Requeridos para DB: aceptamos cualquiera de los dos sets
const DB_SET_LOCAL = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const DB_SET_ADDON = ['MYSQL_ADDON_HOST', 'MYSQL_ADDON_USER', 'MYSQL_ADDON_PASSWORD', 'MYSQL_ADDON_DB'];

function hasAll(keys) {
  return keys.every((k) => {
    const v = process.env[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
}

function requireEnv() {
  const missingAlways = REQUIRED_ALWAYS.filter(
    (k) => !process.env[k] || String(process.env[k]).trim() === ''
  );

  const hasLocal = hasAll(DB_SET_LOCAL);
  const hasAddon = hasAll(DB_SET_ADDON);

  const missingDbLocal = DB_SET_LOCAL.filter(
    (k) => !process.env[k] || String(process.env[k]).trim() === ''
  );
  const missingDbAddon = DB_SET_ADDON.filter(
    (k) => !process.env[k] || String(process.env[k]).trim() === ''
  );

  const missing = [...missingAlways];

  // Si no hay ningún set de DB completo, marcamos el faltante más "útil"
  if (!hasLocal && !hasAddon) {
    // Preferimos mostrar el set local (es el que usa la mayoría en dev),
    // pero también avisamos el alternativo.
    missing.push(...missingDbLocal);
    // eslint-disable-next-line no-console
    console.error('[ENV] DB not configured. Provide either DB_* OR MYSQL_ADDON_* credentials.');
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing DB_*:', missingDbLocal.join(', '));
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing MYSQL_ADDON_*:', missingDbAddon.join(', '));
  }

  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing required env vars:', missing.join(', '));
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}

function env(key, fallback = undefined) {
  const v = process.env[key];
  return v === undefined || v === null || v === '' ? fallback : v;
}

module.exports = {
  requireEnv,
  env,
};
