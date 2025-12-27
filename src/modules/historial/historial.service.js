const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');
const { startOfTodayUtc, addDaysUtc, toIsoUtc } = require('../../utils/dates');

function buildDateRange(filter, fechaDesde, fechaHasta) {
  if (fechaDesde || fechaHasta) {
    const from = fechaDesde ? new Date(fechaDesde) : addDaysUtc(new Date(), -3650);
    const to = fechaHasta ? new Date(fechaHasta) : new Date();
    return { from, to };
  }

  if (filter === 'hoy') {
    const from = startOfTodayUtc();
    return { from, to: addDaysUtc(from, 1) };
  }
  if (filter === '7d') {
    const to = new Date();
    const from = addDaysUtc(to, -7);
    return { from, to };
  }
  // default: all
  return { from: addDaysUtc(new Date(), -3650), to: new Date() };
}

async function listTimelineByResident(residentId, opts = {}) {
  const { page = 1, limit = 20, preset = 'all', fechaDesde, fechaHasta, type } = opts;

  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const offset = (p - 1) * l;

  const range = buildDateRange(preset, fechaDesde, fechaHasta);
  const where = ['t.resident_id = ?', 't.occurred_at >= ?', 't.occurred_at <= ?'];
  const params = [residentId, toIsoUtc(range.from), toIsoUtc(range.to)];

  if (type) { where.push('t.event_type = ?'); params.push(type); }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const items = await query(`
    SELECT
      t.id, t.resident_id, t.user_id, t.event_type, t.ref_table, t.ref_id,
      t.severity, t.title, t.summary, t.occurred_at, t.created_at,
      u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
    FROM timeline_events t
    LEFT JOIN users u ON u.id = t.user_id
    ${whereSql}
    ORDER BY t.occurred_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  const total = await query(`SELECT COUNT(*) AS total FROM timeline_events t ${whereSql}`, params);

  return { page: p, limit: l, total: total[0]?.total || 0, items };
}

async function getTimelineEvent(eventId) {
  const rows = await query(`
    SELECT
      t.id, t.resident_id, t.user_id, t.event_type, t.ref_table, t.ref_id,
      t.severity, t.title, t.summary, t.occurred_at, t.created_at,
      u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
    FROM timeline_events t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.id = ? LIMIT 1
  `, [eventId]);

  if (!rows.length) throw new AppError('NOT_FOUND', 'Timeline event not found', 404);
  const ev = rows[0];

  // Expand detail from ref_table
  let detail = null;
  if (ev.ref_table === 'vitals') {
    const d = await query('SELECT * FROM vitals WHERE id = ? LIMIT 1', [ev.ref_id]);
    detail = d[0] || null;
  } else if (ev.ref_table === 'medications') {
    const d = await query('SELECT * FROM medications WHERE id = ? LIMIT 1', [ev.ref_id]);
    detail = d[0] || null;
  } else if (ev.ref_table === 'observations') {
    const d = await query('SELECT * FROM observations WHERE id = ? LIMIT 1', [ev.ref_id]);
    detail = d[0] || null;
  }

  return { ...ev, detail };
}

module.exports = { listTimelineByResident, getTimelineEvent };
