const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');
const { logAudit } = require('../auditoria/auditoria.service');

function normalizeStatus(status) {
  return ['estable', 'observacion', 'critico'].includes(status) ? status : 'estable';
}

async function getResident(id) {
  const rows = await query(`
    SELECT
      id, first_name, last_name, document_number, room, status,
      emergency_contact_name, emergency_contact_phone, notes,
      is_active, deleted_at, created_at, updated_at
    FROM residents
    WHERE id = ? LIMIT 1
  `, [id]);

  if (!rows.length) throw new AppError('NOT_FOUND', 'Resident not found', 404);
  return rows[0];
}

async function listResidents({ page, limit, q, status, is_active }) {
  const toInt = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : def;
  };

  const p = Math.max(1, toInt(page, 1));
  const l = Math.min(100, Math.max(1, toInt(limit, 20)));
  const offset = (p - 1) * l;

  const where = [];
  const params = [];

  if (q) {
    where.push('(first_name LIKE ? OR last_name LIKE ? OR document_number LIKE ? OR room LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  if (is_active !== undefined) {
    where.push('is_active = ?');
    params.push((is_active === true || is_active === 'true' || is_active === 1 || is_active === '1') ? 1 : 0);
  } else {
    where.push('is_active = 1');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const items = await query(
    `
      SELECT
        id, first_name, last_name, document_number, room, status,
        emergency_contact_name, emergency_contact_phone, notes,
        is_active, deleted_at, created_at, updated_at
      FROM residents
      ${whereSql}
      ORDER BY last_name ASC, first_name ASC
      LIMIT ? OFFSET ?
    `,
    [...params, l, offset]
  );

  const total = await query(
    `SELECT COUNT(*) AS total FROM residents ${whereSql}`,
    params
  );

  return { page: p, limit: l, total: total[0]?.total || 0, items };
}


async function createResident(payload, userId, req) {
  const status = normalizeStatus(payload.status);

  const result = await query(`
    INSERT INTO residents
      (first_name, last_name, document_number, room, status,
       emergency_contact_name, emergency_contact_phone, notes, is_active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    payload.first_name,
    payload.last_name,
    payload.document_number || null,
    payload.room || null,
    status,
    payload.emergency_contact_name || null,
    payload.emergency_contact_phone || null,
    payload.notes || null
  ]);

  const residentId = result.insertId;

  const after = await getResident(residentId);

  await logAudit({
    module: 'residentes',
    action: 'create',
    entity: 'residents',
    entityId: residentId,
    userId,
    before: null,
    after,
    req
  });

  return after;
}

async function updateResident(id, payload, userId, req) {
  const before = await getResident(id);

  const updates = {};
  const allowed = [
    'first_name',
    'last_name',
    'document_number',
    'room',
    'status',
    'emergency_contact_name',
    'emergency_contact_phone',
    'notes'
  ];

  for (const k of allowed) {
    if (payload[k] !== undefined) updates[k] = payload[k];
  }
  if (updates.status !== undefined) updates.status = normalizeStatus(updates.status);

  const fields = Object.keys(updates);
  if (!fields.length) return before;

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await query(`UPDATE residents SET ${sets}, updated_at = NOW() WHERE id = ?`, [...values, id]);

  const after = await getResident(id);

  await logAudit({
    module: 'residentes',
    action: 'update',
    entity: 'residents',
    entityId: id,
    userId,
    before,
    after,
    req
  });

  return after;
}

async function deactivateResident(id, userId, req) {
  const before = await getResident(id);

  if (!before.is_active) return before;

  await query('UPDATE residents SET is_active = 0, deleted_at = NOW(), updated_at = NOW() WHERE id = ?', [id]);
  const after = await getResident(id);

  await logAudit({
    module: 'residentes',
    action: 'deactivate',
    entity: 'residents',
    entityId: id,
    userId,
    before,
    after,
    req
  });

  return after;
}

module.exports = {
  getResident,
  listResidents,
  createResident,
  updateResident,
  deactivateResident
};
