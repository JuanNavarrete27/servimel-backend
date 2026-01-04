// src/config/db.js
// ============================================================
// SERVIMEL — DB (Render -> Clever Cloud MySQL)
// ✅ En Render cargás MYSQL_ADDON_* (Clever Cloud credentials)
// ✅ Mantiene tu debug fuerte (placeholder mismatch + logs)
// ✅ timezone UTC ('Z')
// ✅ Soporta fallback DB_* por si querés correr local
//
// FIX PRO:
// - Clever Cloud suele tener max_user_connections = 5
// - Bajamos connectionLimit (por defecto tuyo era 10 -> rompe)
// - KeepAlive + idle control para no “colgar” conexiones
// - shutdown() para cerrar pool en deploy/restart
// ============================================================

const mysql = require('mysql2/promise');
const { env } = require('./env');

// Helpers: elegimos MYSQL_ADDON_* primero, luego DB_* (local/dev).
const DB_HOST = env('MYSQL_ADDON_HOST', env('DB_HOST'));
const DB_USER = env('MYSQL_ADDON_USER', env('DB_USER'));
const DB_PASSWORD = env('MYSQL_ADDON_PASSWORD', env('DB_PASSWORD'));
const DB_NAME = env('MYSQL_ADDON_DB', env('DB_NAME'));
const DB_PORT = Number(env('MYSQL_ADDON_PORT', env('DB_PORT', 3306)));

// -------------------------
// Connection limit seguro
// -------------------------
// Clever Cloud: max_user_connections suele ser 5.
// Dejamos margen para conexiones internas/otros procesos.
// Default: 3. Nunca permitimos > 4 (a menos que vos lo cambies explícitamente y sepas lo que hacés).
function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

const RAW_LIMIT = env('DB_CONN_LIMIT', 3);
const CONN_LIMIT = clamp(RAW_LIMIT, 1, 4);

// Opcional: loguear configuración una vez (sin secretos)
console.log('[DB] Pool config', {
  host: DB_HOST,
  db: DB_NAME,
  port: DB_PORT,
  connectionLimit: CONN_LIMIT
});

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,

  waitForConnections: true,
  connectionLimit: CONN_LIMIT,
  queueLimit: 0,

  // Evita esperar infinito cuando hay saturación
  acquireTimeout: Number(env('DB_ACQUIRE_TIMEOUT_MS', 10000)),

  // Mantener conexiones vivas (mejor estabilidad en cloud)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // Control de idle para que no queden conexiones “zombies”
  // (mysql2 soporta maxIdle/idleTimeout en pools modernos)
  maxIdle: clamp(env('DB_MAX_IDLE', 2), 0, CONN_LIMIT),
  idleTimeout: Number(env('DB_IDLE_TIMEOUT_MS', 30000)),

  timezone: 'Z',
  charset: 'utf8mb4',
});

// Debug opcional (poco spam): muestra cuando se abre una conexión nueva
if (String(env('DB_DEBUG_POOL', '0')) === '1') {
  pool.on('connection', (conn) => {
    console.log('[DB] New connection', { threadId: conn.threadId });
  });
}

// -------------------------
// Safe params
// -------------------------
function normalizeParams(params) {
  if (!params) return [];
  if (!Array.isArray(params)) return [];
  return params.map((v) => (v === undefined ? null : v));
}

// contador simple de placeholders
function countPlaceholders(sql) {
  const s = String(sql || '');
  const matches = s.match(/\?/g);
  return matches ? matches.length : 0;
}

async function query(sql, params = []) {
  const safeParams = normalizeParams(params);

  const expected = countPlaceholders(sql);
  if (expected !== safeParams.length) {
    console.error('[DB] Placeholder mismatch', {
      expected,
      got: safeParams.length,
      sql,
      params: safeParams,
    });
    throw new Error(`DB_PLACEHOLDER_MISMATCH expected=${expected} got=${safeParams.length}`);
  }

  try {
    // ✅ query() (text protocol) evita mysqld_stmt_execute
    const [rows] = await pool.query(sql, safeParams);
    return rows;
  } catch (err) {
    console.error('[DB] Query failed', {
      sql,
      params: safeParams,
      types: safeParams.map((v) => typeof v),
      err: { code: err?.code, message: err?.message },
    });
    throw err;
  }
}

async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const q = async (sql, params = []) => {
      const safeParams = normalizeParams(params);
      const expected = countPlaceholders(sql);
      if (expected !== safeParams.length) {
        console.error('[DB:TX] Placeholder mismatch', {
          expected,
          got: safeParams.length,
          sql,
          params: safeParams,
        });
        throw new Error(`DB_PLACEHOLDER_MISMATCH expected=${expected} got=${safeParams.length}`);
      }
      const [rows] = await conn.query(sql, safeParams);
      return rows;
    };

    const res = await fn(conn, q);
    await conn.commit();
    return res;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

// -------------------------
// Graceful shutdown (Render / deploy / restart)
// -------------------------
let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    console.log('[DB] Closing pool...');
    await pool.end();
    console.log('[DB] Pool closed');
  } catch (e) {
    console.error('[DB] Pool end error', { message: e?.message });
  }
}

process.on('SIGINT', () => shutdown().finally(() => process.exit(0)));
process.on('SIGTERM', () => shutdown().finally(() => process.exit(0)));

module.exports = { pool, query, tx, shutdown };
