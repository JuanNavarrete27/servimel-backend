const { query } = require('../../config/db');

async function logAudit({
  module,
  action,
  entity,
  entityId = null,
  userId = null,
  before = null,
  after = null,
  req = null
}) {
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || null) : null;
  const userAgent = req ? (req.headers['user-agent'] || null) : null;

  const sql = `
    INSERT INTO audits
      (module, action, entity, entity_id, user_id, before_json, after_json, ip, user_agent)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [
    module,
    action,
    entity,
    entityId,
    userId,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    ip,
    userAgent
  ]);
}

async function listAudits({ page = 1, limit = 20, module, action, entity, userId }) {
  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const offset = (p - 1) * l;

  const where = [];
  const params = [];

  if (module) { where.push('a.module = ?'); params.push(module); }
  if (action) { where.push('a.action = ?'); params.push(action); }
  if (entity) { where.push('a.entity = ?'); params.push(entity); }
  if (userId) { where.push('a.user_id = ?'); params.push(Number(userId)); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await query(`
    SELECT
      a.id, a.module, a.action, a.entity, a.entity_id, a.user_id,
      a.before_json, a.after_json, a.ip, a.user_agent, a.created_at,
      u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
    FROM audits a
    LEFT JOIN users u ON u.id = a.user_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, l, offset]);

  const total = await query(`SELECT COUNT(*) AS total FROM audits a ${whereSql}`, params);
  return { page: p, limit: l, total: total[0]?.total || 0, items: rows };
}

module.exports = { logAudit, listAudits };
