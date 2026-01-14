// src/modules/fisioterapia/fisioterapia.service.js
// ============================================================
// SERVIMEL — Fisioterapia Service (DB real, READ-ONLY)
// Tablas sugeridas:
// - resident_physio
// - physio_sessions
// - physio_notes
//
// ✅ Devuelve ficha fisioterapia por residente
// ✅ Si faltan tablas (o aún no cargaste datos), devuelve vacío consistente
// ============================================================

const { query } = require('../../config/db');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Wrapper tolerante a distintos "query()" (mysql2 vs helper propio)
async function dbQuery(sql, params) {
  const out = await query(sql, params);
  // mysql2/promise: [rows, fields]
  if (Array.isArray(out)) return out[0];
  // helpers: { rows }
  if (out && Array.isArray(out.rows)) return out.rows;
  return out;
}

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Intento de existencia de residente con fallback de tabla
async function ensureResidentExists(residentId) {
  const candidates = ['residentes', 'residents'];
  let lastErr = null;

  for (const table of candidates) {
    try {
      const rows = await dbQuery(`SELECT id FROM \`${table}\` WHERE id = ? LIMIT 1`, [residentId]);
      if (rows && rows.length) return true;
      // si existe tabla pero no existe residente:
      return false;
    } catch (e) {
      lastErr = e;
      // si la tabla no existe, probamos la siguiente
      if (e && e.code === 'ER_NO_SUCH_TABLE') continue;
      // otros errores: cortamos
      throw e;
    }
  }

  // Si ninguna tabla existe, NO rompemos: dejamos que funcione como "modo guía"
  // (pero te lo dejo como error suave: devolvemos true para permitir devolver data vacía)
  if (lastErr && lastErr.code === 'ER_NO_SUCH_TABLE') return true;
  return true;
}

function safeISODate(v) {
  if (!v) return null;
  // mysql DATE puede venir como string 'YYYY-MM-DD'
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // fallback: Date -> YYYY-MM-DD
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildEmpty(residentId) {
  return {
    residentId,
    status: 'sin-plan',
    lastSessionISO: null,
    planSummary: 'Sin datos cargados. Modal informativo (sin endpoints nuevos).',
    sessions: [],
    notes: []
  };
}

async function readSummary(residentId) {
  try {
    const rows = await dbQuery(
      `
      SELECT resident_id, status, plan_summary, last_session_date
      FROM resident_physio
      WHERE resident_id = ?
      LIMIT 1
      `,
      [residentId]
    );

    if (!rows || !rows.length) return null;

    const r = rows[0];
    return {
      residentId: r.resident_id,
      status: r.status || 'sin-plan',
      planSummary: r.plan_summary || '',
      lastSessionISO: safeISODate(r.last_session_date)
    };
  } catch (e) {
    // si la tabla no existe todavía, devolvemos null (modo guía)
    if (e && e.code === 'ER_NO_SUCH_TABLE') return null;
    throw e;
  }
}

async function readSessions(residentId, { limit, offset }) {
  try {
    const rows = await dbQuery(
      `
      SELECT
        id,
        session_date,
        session_type,
        duration_min,
        objective,
        result_text
      FROM physio_sessions
      WHERE resident_id = ?
      ORDER BY session_date DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [residentId, limit, offset]
    );

    return (rows || []).map((r) => ({
      id: r.id,
      dateISO: safeISODate(r.session_date),
      type: r.session_type || 'otros',
      durationMin: Number(r.duration_min || 0),
      objective: r.objective || '',
      result: r.result_text || ''
    }));
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') return [];
    throw e;
  }
}

async function readNotes(residentId, { limit, offset }) {
  try {
    const rows = await dbQuery(
      `
      SELECT
        id,
        note_date,
        author_name,
        note_text
      FROM physio_notes
      WHERE resident_id = ?
      ORDER BY note_date DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [residentId, limit, offset]
    );

    return (rows || []).map((r) => ({
      id: r.id,
      dateISO: safeISODate(r.note_date),
      author: r.author_name || 'Equipo',
      text: r.note_text || ''
    }));
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') return [];
    throw e;
  }
}

exports.getResidentPhysio = async (residentId, paging) => {
  const okId = Number.isInteger(residentId) && residentId > 0;
  if (!okId) throw httpError(400, 'BAD_REQUEST', 'residentId inválido');

  const limit = clamp(Number(paging?.limit ?? 50), 1, 200);
  const offset = clamp(Number(paging?.offset ?? 0), 0, 999999);

  const exists = await ensureResidentExists(residentId);
  if (!exists) throw httpError(404, 'NOT_FOUND', 'Residente no encontrado');

  // base vacía consistente (UI no rompe)
  const base = buildEmpty(residentId);

  const [summary, sessions, notes] = await Promise.all([
    readSummary(residentId),
    readSessions(residentId, { limit, offset }),
    readNotes(residentId, { limit, offset })
  ]);

  // lastSessionISO: si no viene en summary, lo derivamos de sesiones
  const lastSessionISO =
    (summary && summary.lastSessionISO) ||
    (sessions && sessions.length ? sessions[0].dateISO : null);

  return {
    residentId,
    status: (summary && summary.status) || base.status,
    lastSessionISO,
    planSummary: (summary && summary.planSummary) || base.planSummary,
    sessions,
    notes
  };
};
