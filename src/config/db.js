// src/config/db.js
// ============================================================
// SERVIMEL — DB (Clever Cloud MySQL)
// ✅ Usa variables nativas de Clever Cloud (MYSQL_ADDON_*)
// ✅ Mantiene tu debug fuerte (placeholder mismatch + logs)
// ✅ timezone UTC ('Z')
// ============================================================

const mysql = require('mysql2/promise');
const { env } = require('./env');

const pool = mysql.createPool({
  // Clever Cloud
  host: env('MYSQL_ADDON_HOST', env('DB_HOST')),
  user: env('MYSQL_ADDON_USER', env('DB_USER')),
  password: env('MYSQL_ADDON_PASSWORD', env('DB_PASSWORD')),
  database: env('MYSQL_ADDON_DB', env('DB_NAME')),
  port: Number(env('MYSQL_ADDON_PORT', env('DB_PORT', 3306))),

  // Pool settings
  waitForConnections: true,
  connectionLimit: Number(env('DB_CONN_LIMIT', 10)),
  queueLimit: 0,

  // UTC
  timezone: 'Z'
});

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
    // Tiramos error claro (en vez de ER_WRONG_ARGUMENTS)
    throw new Error(`DB_PLACEHOLDER_MISMATCH expected=${expected} got=${safeParams.length}`);
  }

  try {
    // ✅ USAR query() (text protocol) evita mysqld_stmt_execute
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
