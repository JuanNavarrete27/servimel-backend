// src/config/env.js
// ============================================================
// SERVIMEL — Env
// ✅ Soporta LOCAL (DB_*) y CLOUD (MYSQL_ADDON_* de Clever Cloud)
// ✅ Soporta también MYSQL_ADDON_URI (recomendado en Clever)
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

// ✅ NUEVO: si existe URI, la aceptamos como set completo
const DB_SET_URI = ['MYSQL_ADDON_URI'];

function hasAll(keys) {
  return keys.every((k) => {
    const v = process.env[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
}

// ✅ NUEVO: parsea MYSQL_ADDON_URI y completa MYSQL_ADDON_* si faltan
function hydrateAddonFromUriIfNeeded() {
  const uri = process.env.MYSQL_ADDON_URI;
  if (!uri || String(uri).trim() === '') return;

  // si ya están todos los MYSQL_ADDON_* no tocamos nada
  if (hasAll(DB_SET_ADDON)) return;

  try {
    const u = new URL(uri);

    // ejemplo: mysql://user:pass@host:3306/dbname
    const host = u.hostname;
    const port = u.port ? Number(u.port) : 3306;
    const user = decodeURIComponent(u.username || '');
    const pass = decodeURIComponent(u.password || '');
    const db = (u.pathname || '').replace(/^\//, '');

    if (host && !process.env.MYSQL_ADDON_HOST) process.env.MYSQL_ADDON_HOST = host;
    if (user && !process.env.MYSQL_ADDON_USER) process.env.MYSQL_ADDON_USER = user;
    if (pass && !process.env.MYSQL_ADDON_PASSWORD) process.env.MYSQL_ADDON_PASSWORD = pass;
    if (db && !process.env.MYSQL_ADDON_DB) process.env.MYSQL_ADDON_DB = db;
    if (!process.env.MYSQL_ADDON_PORT) process.env.MYSQL_ADDON_PORT = String(port);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[ENV] Invalid MYSQL_ADDON_URI format');
  }
}

function requireEnv() {
  // ✅ primero: si hay URI, completamos MYSQL_ADDON_* automáticamente
  hydrateAddonFromUriIfNeeded();

  const missingAlways = REQUIRED_ALWAYS.filter(
    (k) => !process.env[k] || String(process.env[k]).trim() === ''
  );

  const hasLocal = hasAll(DB_SET_LOCAL);
  const hasAddon = hasAll(DB_SET_ADDON);
  const hasUri = hasAll(DB_SET_URI); // no “garantiza” parse OK, pero sirve para validar que está

  const missingDbLocal = DB_SET_LOCAL.filter(
    (k) => !process.env[k] || String(process.env[k]).trim() === ''
  );
  const missingDbAddon = DB_SET_ADDON.filter(
    (k) => !process.env[k] || String(process.env[k]).trim() === ''
  );

  const missing = [...missingAlways];

  // Si no hay ningún set de DB completo, marcamos el faltante más "útil"
  if (!hasLocal && !hasAddon && !hasUri) {
    missing.push(...missingDbLocal);
    // eslint-disable-next-line no-console
    console.error('[ENV] DB not configured. Provide either DB_* OR MYSQL_ADDON_* OR MYSQL_ADDON_URI.');
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing DB_*:', missingDbLocal.join(', '));
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing MYSQL_ADDON_*:', missingDbAddon.join(', '));
    // eslint-disable-next-line no-console
    console.error('[ENV] Missing MYSQL_ADDON_URI:', 'MYSQL_ADDON_URI');
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
