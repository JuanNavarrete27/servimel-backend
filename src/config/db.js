// src/config/db.js
// ============================================================
// SERVIMEL — DB (Render -> Clever Cloud MySQL)
// ✅ En Render cargás MYSQL_ADDON_* (Clever Cloud credentials)
// ✅ Mantiene tu debug fuerte (placeholder mismatch + logs)
// ✅ timezone UTC ('Z')
// ✅ Soporta fallback DB_* por si querés correr local
// ============================================================

const mysql = require('mysql2/promise');
const { env } = require('./env');

// Helpers: elegimos MYSQL_ADDON_* primero (porque en Render los seteaste así),
// y si no existen, caemos a DB_* (para local/dev).
const DB_HOST = env('MYSQL_ADDON_HOST', env('DB_HOST'));
const DB_USER = env('MYSQL_ADDON_USER', env('DB_USER'));
const DB_PASSWORD = env('MYSQL_ADDON_PASSWORD', env('DB_PASSWORD'));
const DB_NAME = env('MYSQL_ADDON_DB', env('DB_NAME'));
const DB_PORT = Number(env('MYSQL_ADDON_PORT', env('DB_PORT', 3306)));

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,

  waitForConnections: true,
  connectionLimit: Number(env('DB_CONN_LIMIT', 10)),
  queueLimit: 0,

  timezone: 'Z',
  // Recomendado para MySQL8 / utf8mb4
  charset: 'utf8mb4',
});

// -------------------------
// Safe params
// -------------------------
function normalizeParams(params) {
  if (!params) return [];
  if (!Array.isArray(params)) return []; // <- si por error llega objeto, no rompas
  return params.map((v) => (v === undefined ? null : v));
}

// contador simple de placeholders (no perfecto, pero suficiente para debug)
function countPlaceholders(sql) {
  const s = String(sql || '');
  const matches = s.match(/\?/g);
  return matches ? matches.length : 0;
}

async function query(sql, params = []) {
  const safeParams = normalizeParams(params);

  // Debug fuerte: si no matchea, lo ves YA
  const expected = countPlaceholders(sql);
  if (expected !== safeParams.length) {
    console.error('[DB] Placeholder mismatch', {
      expected,
      got: safeParams.length,
      sql,
      params: safeParams
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
      types: safeParams.map(v => typeof v),
      err: { code: err?.code, message: err?.message }
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
          params: safeParams
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
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, tx };
