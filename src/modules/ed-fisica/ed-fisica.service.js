// src/modules/ed-fisica/ed-fisica.service.js
// ============================================================
// SERVIMEL — Educación Física Service (DB real)
// Usa: query() desde src/config/db
//
// ✅ Fixes importantes:
// - plan_json en MySQL viene como string (a veces): lo parseamos seguro
// - days: antes tenías una condición rota; ahora siempre sale array
// - updatePlan: no hace normalizePlanPayload con weekEnd inventado si no corresponde
// - createPlan/updatePlan guardan plan_json consistente
// ============================================================

const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');

let logAudit = null;
try {
  ({ logAudit } = require('../auditoria/auditoria.service'));
} catch {
  logAudit = null;
}

function isIsoDate(x) {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function toDateOnly(iso) {
  const v = String(iso || '').trim();
  if (!isIsoDate(v)) return null;
  return v;
}

function addDays(iso, days) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + Number(days || 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function safeString(s, max) {
  const v = (s == null ? '' : String(s)).trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function safeJsonParse(x) {
  if (x == null) return null;
  if (typeof x === 'object') return x;
  const raw = String(x || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizePlanPayload(payload) {
  const residentId = Number(payload?.residentId);
  const weekStart = toDateOnly(payload?.weekStart);
  const weekEnd = toDateOnly(payload?.weekEnd) || (weekStart ? addDays(weekStart, 6) : null);
  const status = payload?.status === 'published' ? 'published' : 'draft';
  const title = safeString(payload?.title, 120);

  const days = Array.isArray(payload?.days) ? payload.days : [];
  const cleanDays = days.slice(0, 7).map((d, idx) => {
    const exercises = Array.isArray(d?.exercises) ? d.exercises : [];
    return {
      dayIndex: Number.isFinite(Number(d?.dayIndex)) ? Number(d.dayIndex) : idx,
      title: safeString(d?.title, 120) || '',
      sessionType: safeString(d?.sessionType, 24) || 'Mixto',
      durationTargetMin: Number.isFinite(Number(d?.durationTargetMin)) ? Number(d.durationTargetMin) : 0,
      goals: safeString(d?.goals, 600) || '',
      contraindications: safeString(d?.contraindications, 600) || '',
      exercises: exercises.slice(0, 60).map((ex) => ({
        name: safeString(ex?.name, 140) || '',
        sets: Number.isFinite(Number(ex?.sets)) ? Number(ex.sets) : 0,
        reps: Number.isFinite(Number(ex?.reps)) ? Number(ex.reps) : 0,
        durationMin: Number.isFinite(Number(ex?.durationMin)) ? Number(ex.durationMin) : 0,
        intensity: safeString(ex?.intensity, 16) || 'Moderada',
        notes: safeString(ex?.notes, 600) || '',
        tags: Array.isArray(ex?.tags) ? ex.tags.slice(0, 12).map((t) => safeString(t, 24)).filter(Boolean) : [],
      })),
    };
  });

  if (!residentId || residentId <= 0) throw new AppError('residentId inválido', 400);
  if (!weekStart) throw new AppError('weekStart inválido (YYYY-MM-DD)', 400);
  if (!weekEnd) throw new AppError('weekEnd inválido', 400);

  return { residentId, weekStart, weekEnd, status, title, days: cleanDays };
}

function mapPlanRow(r) {
  const planJson = safeJsonParse(r.plan_json) || {};
  const days = Array.isArray(planJson.days) ? planJson.days : [];

  return {
    id: r.id,
    residentId: r.resident_id,
    weekStart: String(r.week_start),
    weekEnd: String(r.week_end),
    status: r.status,
    title: r.title || null,
    days,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,

    // extra (si mañana guardás más cosas en plan_json)
    ...planJson,

    // y volvemos a imponer los “core” para que no los pise plan_json
    id: r.id,
    residentId: r.resident_id,
    weekStart: String(r.week_start),
    weekEnd: String(r.week_end),
    status: r.status,
    title: r.title || null,
    days,
  };
}

module.exports = {
  async getPlanByResidentWeek({ residentId, weekStart }) {
    const ws = toDateOnly(weekStart);
    if (!residentId || residentId <= 0) throw new AppError('residentId inválido', 400);
    if (!ws) throw new AppError('weekStart inválido (YYYY-MM-DD)', 400);

    const sql = `
      SELECT id, resident_id, week_start, week_end, status, title, plan_json, updated_at
      FROM edf_weekly_plans
      WHERE resident_id = ? AND week_start = ?
      LIMIT 1
    `;
    const rows = await query(sql, [residentId, ws]);
    if (!rows?.length) return null;

    return mapPlanRow(rows[0]);
  },

  async createPlan({ payload, userId }) {
    const clean = normalizePlanPayload(payload);

    const exists = await query(
      `SELECT id FROM edf_weekly_plans WHERE resident_id = ? AND week_start = ? LIMIT 1`,
      [clean.residentId, clean.weekStart]
    );
    if (exists?.length) throw new AppError('Ya existe un plan para ese residente y semana', 409);

    const planJson = { days: clean.days };

    const ins = await query(
      `
      INSERT INTO edf_weekly_plans
        (resident_id, week_start, week_end, status, title, plan_json, created_by, updated_by)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        clean.residentId,
        clean.weekStart,
        clean.weekEnd,
        clean.status,
        clean.title,
        JSON.stringify(planJson),
        userId,
        userId,
      ]
    );

    const id = ins?.insertId;

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'edf_plan_create',
        entity: 'edf_weekly_plans',
        entityId: id,
        meta: { residentId: clean.residentId, weekStart: clean.weekStart },
      }).catch(() => {});
    }

    return this.getPlanByResidentWeek({ residentId: clean.residentId, weekStart: clean.weekStart });
  },

  async updatePlan({ id, payload, userId }) {
    if (!id || id <= 0) throw new AppError('id inválido', 400);

    const rows = await query(
      `SELECT id, resident_id, week_start, week_end, status FROM edf_weekly_plans WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows?.length) throw new AppError('Plan no encontrado', 404);

    const current = rows[0];

    if (current.status === 'published') {
      throw new AppError('El plan está publicado y no se puede editar (configurable)', 409);
    }

    // Permitimos editar days/title (y opcionalmente weekEnd)
    const clean = normalizePlanPayload({
      residentId: payload?.residentId ?? current.resident_id,
      weekStart: payload?.weekStart ?? String(current.week_start),
      weekEnd: payload?.weekEnd ?? String(current.week_end),
      status: 'draft',
      title: payload?.title ?? null,
      days: payload?.days ?? [],
    });

    const planJson = { days: clean.days };

    await query(
      `
      UPDATE edf_weekly_plans
      SET week_end = ?, title = ?, plan_json = ?, updated_by = ?
      WHERE id = ?
      `,
      [clean.weekEnd, clean.title, JSON.stringify(planJson), userId, id]
    );

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'edf_plan_update',
        entity: 'edf_weekly_plans',
        entityId: id,
        meta: { residentId: clean.residentId, weekStart: clean.weekStart },
      }).catch(() => {});
    }

    return this.getPlanByResidentWeek({ residentId: clean.residentId, weekStart: clean.weekStart });
  },

  async publishPlan({ id, userId }) {
    if (!id || id <= 0) throw new AppError('id inválido', 400);

    const rows = await query(
      `SELECT id, resident_id, week_start, status FROM edf_weekly_plans WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows?.length) throw new AppError('Plan no encontrado', 404);

    const current = rows[0];

    if (current.status === 'published') {
      return this.getPlanByResidentWeek({ residentId: current.resident_id, weekStart: String(current.week_start) });
    }

    await query(`UPDATE edf_weekly_plans SET status = 'published', updated_by = ? WHERE id = ?`, [userId, id]);

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'edf_plan_publish',
        entity: 'edf_weekly_plans',
        entityId: id,
        meta: { residentId: current.resident_id, weekStart: String(current.week_start) },
      }).catch(() => {});
    }

    return this.getPlanByResidentWeek({ residentId: current.resident_id, weekStart: String(current.week_start) });
  },

  async listLogs({ residentId, weekStart }) {
    const ws = toDateOnly(weekStart);
    if (!residentId || residentId <= 0) throw new AppError('residentId inválido', 400);
    if (!ws) throw new AppError('weekStart inválido (YYYY-MM-DD)', 400);

    const we = addDays(ws, 6);

    const rows = await query(
      `
      SELECT id, resident_id, date_iso, session_type, duration_min, rpe, mood, pain, notes, created_at
      FROM edf_session_logs
      WHERE resident_id = ? AND date_iso BETWEEN ? AND ?
      ORDER BY date_iso DESC, id DESC
      `,
      [residentId, ws, we]
    );

    return (rows || []).map((r) => ({
      id: r.id,
      residentId: r.resident_id,
      dateIso: String(r.date_iso),
      sessionType: r.session_type,
      durationMin: r.duration_min,
      rpe: r.rpe,
      mood: r.mood,
      pain: r.pain,
      notes: r.notes || '',
    }));
  },

  async createLog({ payload, userId }) {
    const residentId = Number(payload?.residentId);
    const dateIso = toDateOnly(payload?.dateIso);

    if (!residentId || residentId <= 0) throw new AppError('residentId inválido', 400);
    if (!dateIso) throw new AppError('dateIso inválido (YYYY-MM-DD)', 400);

    const sessionType = safeString(payload?.sessionType, 24) || 'Mixto';
    const durationMin = Math.max(5, Math.min(240, Number(payload?.durationMin) || 30));
    const rpe = Math.max(1, Math.min(10, Number(payload?.rpe) || 5));
    const mood = safeString(payload?.mood, 12) || 'Normal';
    const pain = safeString(payload?.pain, 12) || 'No';
    const notes = safeString(payload?.notes, 800);

    const ins = await query(
      `
      INSERT INTO edf_session_logs
        (resident_id, date_iso, session_type, duration_min, rpe, mood, pain, notes, created_by)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [residentId, dateIso, sessionType, durationMin, rpe, mood, pain, notes, userId]
    );

    const id = ins?.insertId;

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'edf_log_create',
        entity: 'edf_session_logs',
        entityId: id,
        meta: { residentId, dateIso },
      }).catch(() => {});
    }

    return {
      id,
      residentId,
      dateIso,
      sessionType,
      durationMin,
      rpe,
      mood,
      pain,
      notes: notes || '',
    };
  },
};
