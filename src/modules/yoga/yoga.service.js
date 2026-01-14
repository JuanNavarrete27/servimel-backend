// src/modules/yoga/yoga.service.js
// ============================================================
// SERVIMEL — Yoga Service (DB real)
// Tablas: yoga_sequences, yoga_week_plans
// ============================================================

const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');

// audit opcional (si existe en tu repo)
let logAudit = null;
try {
  // ajustá path si tu auditoria está en otro lado
  ({ logAudit } = require('../auditoria/auditoria.service'));
} catch {
  logAudit = null;
}

function safeJsonParse(x, fallback) {
  if (x == null) return fallback;
  if (typeof x === 'object') return x;
  try { return JSON.parse(x); } catch { return fallback; }
}

function getInsertId(result) {
  // soporta wrappers distintos
  return result?.insertId ?? result?.[0]?.insertId ?? null;
}

// =========================
// SEQUENCES
// =========================
async function listSequences({ limit = 200 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 500);

  const rows = await query(
    `
      SELECT id, name, tone, minutes, items_json, note, created_by, updated_by, created_at, updated_at
      FROM yoga_sequences
      WHERE is_active = 1
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `,
    [lim]
  );

  const data = (rows || []).map(r => ({
    id: Number(r.id),
    name: r.name,
    tone: r.tone,
    minutes: Number(r.minutes),
    items: safeJsonParse(r.items_json, []),
    note: r.note ?? null,
    createdBy: r.created_by ?? null,
    updatedBy: r.updated_by ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return data;
}

async function createSequence({ name, tone, minutes, items, note }, userId) {
  const payload = JSON.stringify(items);

  const result = await query(
    `
      INSERT INTO yoga_sequences (name, tone, minutes, items_json, note, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [name, tone, minutes, payload, note ?? null, userId ?? null, userId ?? null]
  );

  const id = getInsertId(result);
  if (!id) throw new AppError('No se pudo crear la secuencia', 500);

  if (logAudit) {
    try {
      await logAudit({
        userId: userId ?? null,
        action: 'YOGA_SEQUENCE_CREATE',
        entity: 'yoga_sequences',
        entityId: id,
        meta: { name, tone, minutes },
      });
    } catch {}
  }

  return Number(id);
}

async function updateSequence(id, { name, tone, minutes, items, note }, userId) {
  const payload = JSON.stringify(items);

  const result = await query(
    `
      UPDATE yoga_sequences
      SET name = ?, tone = ?, minutes = ?, items_json = ?, note = ?, updated_by = ?, is_active = 1
      WHERE id = ?
      LIMIT 1
    `,
    [name, tone, minutes, payload, note ?? null, userId ?? null, id]
  );

  const affected = result?.affectedRows ?? result?.[0]?.affectedRows ?? 0;
  if (!affected) throw new AppError('Secuencia no encontrada', 404);

  if (logAudit) {
    try {
      await logAudit({
        userId: userId ?? null,
        action: 'YOGA_SEQUENCE_UPDATE',
        entity: 'yoga_sequences',
        entityId: id,
        meta: { name, tone, minutes },
      });
    } catch {}
  }

  return true;
}

async function softDeleteSequence(id, userId) {
  const result = await query(
    `
      UPDATE yoga_sequences
      SET is_active = 0, updated_by = ?
      WHERE id = ?
      LIMIT 1
    `,
    [userId ?? null, id]
  );

  const affected = result?.affectedRows ?? result?.[0]?.affectedRows ?? 0;
  if (!affected) throw new AppError('Secuencia no encontrada', 404);

  if (logAudit) {
    try {
      await logAudit({
        userId: userId ?? null,
        action: 'YOGA_SEQUENCE_DELETE',
        entity: 'yoga_sequences',
        entityId: id,
        meta: {},
      });
    } catch {}
  }

  return true;
}

// =========================
// WEEK PLANS
// =========================
async function getWeekPlan(residentId, weekStartISO) {
  const rows = await query(
    `
      SELECT resident_id, week_start, plan_json, updated_at, updated_by
      FROM yoga_week_plans
      WHERE resident_id = ? AND week_start = ? AND is_active = 1
      LIMIT 1
    `,
    [residentId, weekStartISO]
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  return {
    residentId: Number(row.resident_id),
    weekStartISO: String(row.week_start), // YYYY-MM-DD
    updatedAtISO: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by ?? null,
    plan: safeJsonParse(row.plan_json, { days: [] }),
  };
}

async function upsertWeekPlan(residentId, weekStartISO, planObj, userId) {
  const payload = JSON.stringify(planObj);

  // requiere UNIQUE (resident_id, week_start)
  const result = await query(
    `
      INSERT INTO yoga_week_plans (resident_id, week_start, plan_json, updated_by, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        plan_json = VALUES(plan_json),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP,
        is_active = 1
    `,
    [residentId, weekStartISO, payload, userId ?? null]
  );

  const affected = result?.affectedRows ?? result?.[0]?.affectedRows ?? 0;
  if (!affected) throw new AppError('No se pudo guardar el plan', 500);

  if (logAudit) {
    try {
      await logAudit({
        userId: userId ?? null,
        action: 'YOGA_WEEKPLAN_UPSERT',
        entity: 'yoga_week_plans',
        entityId: null,
        meta: { residentId, weekStartISO },
      });
    } catch {}
  }

  return true;
}

module.exports = {
  listSequences,
  createSequence,
  updateSequence,
  softDeleteSequence,
  getWeekPlan,
  upsertWeekPlan,
};
