// src/modules/cocina/cocina.service.js
// ============================================================
// SERVIMEL — Cocina Service (DB real)
// - Menús semanales
// - Asignación por residente/semana
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

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function safeStr(v, max) {
  const s = (v == null ? '' : String(v)).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function blankMenuJson(weekStart) {
  // Keys “seguras” (podés cambiar en frontend si usás otros):
  const mealKeys = ['desayuno', 'almuerzo', 'merienda', 'cena'];

  const days = Array.from({ length: 7 }).map((_, i) => {
    const dateIso = addDays(weekStart, i);
    const meals = {};
    for (const k of mealKeys) {
      meals[k] = { main: '', side: '', drink: '', dessert: '', notes: '', tags: [] };
    }
    return { dayIndex: i, dateIso, meals };
  });

  return {
    schema: 'kitchen-v1',
    weekStart,
    mealKeys,
    days,
  };
}

function parseJsonField(x) {
  if (x == null) return null;
  if (typeof x === 'object') return x;
  try {
    return JSON.parse(String(x));
  } catch {
    return null;
  }
}

function normalizeMenuPayload(payload) {
  const weekStart = safeStr(payload?.weekStart, 10);
  const weekEnd = safeStr(payload?.weekEnd, 10) || (weekStart && isIsoDate(weekStart) ? addDays(weekStart, 6) : null);
  const title = safeStr(payload?.title, 120);
  const status = payload?.status === 'published' ? 'published' : 'draft';

  if (!weekStart || !isIsoDate(weekStart)) throw new AppError('weekStart inválido (YYYY-MM-DD)', 400);
  if (!weekEnd || !isIsoDate(weekEnd)) throw new AppError('weekEnd inválido (YYYY-MM-DD)', 400);

  // O aceptamos menuJson del frontend o generamos uno en blanco
  const menuJson = payload?.menuJson
    ? payload.menuJson
    : payload?.menu_json
      ? payload.menu_json
      : null;

  const cleanMenuJson = menuJson && typeof menuJson === 'object' ? menuJson : null;

  return { weekStart, weekEnd, title, status, menuJson: cleanMenuJson };
}

module.exports = {
  // ---------------- MENUS ----------------

  async listMenusByWeek({ weekStart }) {
    if (!weekStart || !isIsoDate(weekStart)) throw new AppError('weekStart inválido', 400);

    const rows = await query(
      `
      SELECT id, week_start, week_end, status, title, menu_json, updated_at
      FROM kitchen_weekly_menus
      WHERE week_start = ?
      ORDER BY status DESC, id DESC
      `,
      [weekStart]
    );

    return (rows || []).map(r => ({
      id: r.id,
      weekStart: String(r.week_start),
      weekEnd: String(r.week_end),
      status: r.status,
      title: r.title || null,
      menuJson: parseJsonField(r.menu_json) || {},
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));
  },

  async getMenuById({ id }) {
    if (!id || id <= 0) throw new AppError('id inválido', 400);

    const rows = await query(
      `
      SELECT id, week_start, week_end, status, title, menu_json, updated_at
      FROM kitchen_weekly_menus
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows?.length) throw new AppError('Menú no encontrado', 404);

    const r = rows[0];
    return {
      id: r.id,
      weekStart: String(r.week_start),
      weekEnd: String(r.week_end),
      status: r.status,
      title: r.title || null,
      menuJson: parseJsonField(r.menu_json) || {},
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    };
  },

  async createMenu({ payload, userId }) {
    const weekStart = safeStr(payload?.weekStart, 10);
    if (!weekStart || !isIsoDate(weekStart)) throw new AppError('weekStart inválido (YYYY-MM-DD)', 400);

    const weekEnd = safeStr(payload?.weekEnd, 10) || addDays(weekStart, 6);
    const title = safeStr(payload?.title, 120) || `Menú semanal`;
    const duplicateFromMenuId = Number(payload?.duplicateFromMenuId || 0);

    let menuJson = blankMenuJson(weekStart);

    if (duplicateFromMenuId && duplicateFromMenuId > 0) {
      const src = await query(
        `SELECT menu_json FROM kitchen_weekly_menus WHERE id = ? LIMIT 1`,
        [duplicateFromMenuId]
      );
      if (!src?.length) throw new AppError('No existe el menú a duplicar', 404);

      const srcJson = parseJsonField(src[0].menu_json);
      if (srcJson && typeof srcJson === 'object') {
        // clonamos pero actualizamos weekStart
        menuJson = { ...srcJson, weekStart };
      }
    }

    const ins = await query(
      `
      INSERT INTO kitchen_weekly_menus
        (week_start, week_end, status, title, menu_json, created_by, updated_by)
      VALUES
        (?, ?, 'draft', ?, ?, ?, ?)
      `,
      [weekStart, weekEnd, title, JSON.stringify(menuJson), userId, userId]
    );

    const id = ins?.insertId;

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'kitchen_menu_create',
        entity: 'kitchen_weekly_menus',
        entityId: id,
        meta: { weekStart },
      }).catch(() => {});
    }

    return this.getMenuById({ id });
  },

  async updateMenu({ id, payload, userId }) {
    if (!id || id <= 0) throw new AppError('id inválido', 400);

    const currentRows = await query(
      `SELECT id, status FROM kitchen_weekly_menus WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!currentRows?.length) throw new AppError('Menú no encontrado', 404);

    const current = currentRows[0];
    if (current.status === 'published') {
      throw new AppError('El menú está publicado y no se puede editar (configurable)', 409);
    }

    const clean = normalizeMenuPayload(payload);

    const menuJson = clean.menuJson && typeof clean.menuJson === 'object'
      ? clean.menuJson
      : blankMenuJson(clean.weekStart);

    await query(
      `
      UPDATE kitchen_weekly_menus
      SET week_start = ?, week_end = ?, title = ?, menu_json = ?, updated_by = ?
      WHERE id = ?
      `,
      [clean.weekStart, clean.weekEnd, clean.title, JSON.stringify(menuJson), userId, id]
    );

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'kitchen_menu_update',
        entity: 'kitchen_weekly_menus',
        entityId: id,
        meta: { weekStart: clean.weekStart },
      }).catch(() => {});
    }

    return this.getMenuById({ id });
  },

  async publishMenu({ id, userId }) {
    if (!id || id <= 0) throw new AppError('id inválido', 400);

    const rows = await query(
      `SELECT id, status FROM kitchen_weekly_menus WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows?.length) throw new AppError('Menú no encontrado', 404);

    if (rows[0].status === 'published') {
      return this.getMenuById({ id });
    }

    await query(
      `UPDATE kitchen_weekly_menus SET status = 'published', updated_by = ? WHERE id = ?`,
      [userId, id]
    );

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'kitchen_menu_publish',
        entity: 'kitchen_weekly_menus',
        entityId: id,
        meta: {},
      }).catch(() => {});
    }

    return this.getMenuById({ id });
  },

  // ---------------- ASSIGNMENTS ----------------

  async listAssignments({ weekStart }) {
    if (!weekStart || !isIsoDate(weekStart)) throw new AppError('weekStart inválido', 400);

    const rows = await query(
      `
      SELECT id, resident_id, week_start, menu_id, diet_type, resident_notes, updated_at
      FROM kitchen_resident_assignments
      WHERE week_start = ?
      ORDER BY resident_id ASC
      `,
      [weekStart]
    );

    return (rows || []).map(r => ({
      id: r.id,
      residentId: r.resident_id,
      weekStart: String(r.week_start),
      menuId: r.menu_id == null ? null : Number(r.menu_id),
      dietType: r.diet_type || '',
      residentNotes: r.resident_notes || '',
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));
  },

  async saveAssignments({ payload, userId }) {
    const weekStart = safeStr(payload?.weekStart, 10);
    if (!weekStart || !isIsoDate(weekStart)) throw new AppError('weekStart inválido (YYYY-MM-DD)', 400);

    const items = Array.isArray(payload?.assignments) ? payload.assignments : [];
    if (!items.length) return { saved: 0 };

    let saved = 0;

    for (const it of items) {
      const residentId = Number(it?.residentId);
      if (!residentId || residentId <= 0) continue;

      const menuIdRaw = it?.menuId;
      const menuId = menuIdRaw === null || menuIdRaw === undefined || menuIdRaw === '' ? null : Number(menuIdRaw);
      const dietType = safeStr(it?.dietType, 80);
      const residentNotes = safeStr(it?.residentNotes, 240);

      // upsert por UNIQUE(resident_id, week_start)
      await query(
        `
        INSERT INTO kitchen_resident_assignments
          (resident_id, week_start, menu_id, diet_type, resident_notes, updated_by)
        VALUES
          (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          menu_id = VALUES(menu_id),
          diet_type = VALUES(diet_type),
          resident_notes = VALUES(resident_notes),
          updated_by = VALUES(updated_by)
        `,
        [residentId, weekStart, menuId, dietType, residentNotes, userId]
      );

      saved += 1;
    }

    if (logAudit && userId) {
      await logAudit({
        userId,
        action: 'kitchen_assignments_save',
        entity: 'kitchen_resident_assignments',
        entityId: null,
        meta: { weekStart, count: saved },
      }).catch(() => {});
    }

    return { saved };
  },

  async getViewerData({ residentId, weekStart }) {
    if (!residentId || residentId <= 0) throw new AppError('residentId inválido', 400);
    if (!weekStart || !isIsoDate(weekStart)) throw new AppError('weekStart inválido', 400);

    const a = await query(
      `
      SELECT id, resident_id, week_start, menu_id, diet_type, resident_notes
      FROM kitchen_resident_assignments
      WHERE resident_id = ? AND week_start = ?
      LIMIT 1
      `,
      [residentId, weekStart]
    );

    const assignment = a?.length
      ? {
          id: a[0].id,
          residentId: a[0].resident_id,
          weekStart: String(a[0].week_start),
          menuId: a[0].menu_id == null ? null : Number(a[0].menu_id),
          dietType: a[0].diet_type || '',
          residentNotes: a[0].resident_notes || '',
        }
      : {
          id: null,
          residentId,
          weekStart,
          menuId: null,
          dietType: '',
          residentNotes: '',
        };

    let menu = null;

    if (assignment.menuId) {
      const m = await query(
        `
        SELECT id, week_start, week_end, status, title, menu_json, updated_at
        FROM kitchen_weekly_menus
        WHERE id = ?
        LIMIT 1
        `,
        [assignment.menuId]
      );

      if (m?.length) {
        const r = m[0];
        menu = {
          id: r.id,
          weekStart: String(r.week_start),
          weekEnd: String(r.week_end),
          status: r.status,
          title: r.title || null,
          menuJson: parseJsonField(r.menu_json) || {},
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        };
      }
    }

    return { assignment, menu };
  },
};
