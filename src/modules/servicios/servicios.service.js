// src/modules/servicios/servicios.service.js
// ============================================================
// SERVIMEL — Servicios (DB real)
// Tablas esperadas (ver servicios.sql):
//   - service_categories
//   - service_items
//
// ✅ Slugs soportados (coinciden con tu frontend):
//   medicina-general | yoga | ed-fisica | cocina | fisioterapia
//
// ✅ Respuestas normalizadas (is_active -> boolean)
// ✅ Búsqueda por q (LIKE) + paginación
// ✅ CRUD items (soft-delete: is_active=0)
// ✅ (Opcional) Auditoría si pasás userId/req (sin romper si no se pasa)
// ============================================================

const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');

let logAuditSafe = null;
try {
  // opcional: si existe auditoría la usamos, si no, no rompe
  // eslint-disable-next-line global-require
  logAuditSafe = require('../auditoria/auditoria.service').logAudit;
} catch {
  logAuditSafe = null;
}

const ALLOWED_SLUGS = [
  'medicina-general',
  'yoga',
  'fisioterapia',
  'cocina',
  'ed-fisica'
];

const SLUG_ALIASES = {
  medicina_general: 'medicina-general',
  'medicina general': 'medicina-general',
  medicina: 'medicina-general',

  'educacion-fisica': 'ed-fisica',
  'educacion fisica': 'ed-fisica',
  'educación-física': 'ed-fisica',
  'educación física': 'ed-fisica',
  'ed fisica': 'ed-fisica',
  ed_fisica: 'ed-fisica',
  edfisica: 'ed-fisica',

  fisio: 'fisioterapia'
};

function normalizeSlug(slug) {
  if (!slug) return null;

  const raw = String(slug)
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '');

  const normalized = SLUG_ALIASES[raw] || raw;
  return ALLOWED_SLUGS.includes(normalized) ? normalized : null;
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function mapCategoryRow(c) {
  return {
    id: Number(c.id),
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    is_active: Number(c.is_active) === 1,
    created_at: c.created_at,
    updated_at: c.updated_at
  };
}

function mapItemRow(i) {
  return {
    id: Number(i.id),
    category_id: Number(i.category_id),
    title: i.title,
    description: i.description ?? null,
    content: i.content ?? null,
    is_active: Number(i.is_active) === 1,
    created_at: i.created_at,
    updated_at: i.updated_at
  };
}

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

async function getCategoryBySlug(slug, opts = {}) {
  const normalized = normalizeSlug(slug);
  if (!normalized) throw new AppError('SERVICE_NOT_FOUND', 'Servicio no encontrado', 404);

  const includeInactive = !!opts.includeInactive;

  const rows = await query(
    `
    SELECT id, slug, name, description, is_active, created_at, updated_at
    FROM service_categories
    WHERE slug = ?
      ${includeInactive ? '' : 'AND is_active = 1'}
    LIMIT 1
  `,
    [normalized]
  );

  if (!rows.length) throw new AppError('SERVICE_NOT_FOUND', 'Servicio no encontrado', 404);
  return mapCategoryRow(rows[0]);
}

async function listCategories() {
  const rows = await query(
    `
    SELECT id, slug, name, description, is_active, created_at, updated_at
    FROM service_categories
    WHERE is_active = 1
    ORDER BY name ASC
  `
  );
  return rows.map(mapCategoryRow);
}

async function listItemsByCategory(
  categoryId,
  { page = 1, limit = 20, q, includeInactive = false } = {}
) {
  const p = Math.max(1, toInt(page, 1));
  const l = Math.min(100, Math.max(1, toInt(limit, 20)));
  const offset = (p - 1) * l;

  const where = ['category_id = ?'];
  const params = [Number(categoryId)];

  if (!includeInactive) where.push('is_active = 1');

  if (q) {
    where.push('(title LIKE ? OR description LIKE ? OR content LIKE ?)');
    const like = `%${String(q)}%`;
    params.push(like, like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const itemsRows = await query(
    `
    SELECT id, category_id, title, description, content, is_active, created_at, updated_at
    FROM service_items
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `,
    [...params, l, offset]
  );

  const totalRows = await query(
    `
    SELECT COUNT(*) AS total
    FROM service_items
    ${whereSql}
  `,
    params
  );

  return {
    page: p,
    limit: l,
    total: Number(totalRows[0]?.total || 0),
    items: itemsRows.map(mapItemRow)
  };
}

async function getCategoryWithItems(slug, opts = {}) {
  const includeInactive = !!opts.includeInactive;

  const category = await getCategoryBySlug(slug, { includeInactive });

  const items = await listItemsByCategory(category.id, {
    page: opts.page,
    limit: opts.limit,
    q: opts.q,
    includeInactive
  });

  // compat simple (muchas UIs quieren array directo)
  return { category, items: items.items, page: items.page, limit: items.limit, total: items.total };
}

async function getItem(categoryId, id, opts = {}) {
  const includeInactive = !!opts.includeInactive;

  const rows = await query(
    `
    SELECT id, category_id, title, description, content, is_active, created_at, updated_at
    FROM service_items
    WHERE id = ? AND category_id = ?
      ${includeInactive ? '' : 'AND is_active = 1'}
    LIMIT 1
  `,
    [Number(id), Number(categoryId)]
  );

  if (!rows.length) throw new AppError('ITEM_NOT_FOUND', 'Item no encontrado', 404);
  return mapItemRow(rows[0]);
}

async function createItem(slug, payload, userId = null, req = null) {
  const category = await getCategoryBySlug(slug, { includeInactive: false });

  const title = String(payload?.title ?? '').trim();
  if (!title) {
    throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, [
      { field: 'title', where: 'body', issue: 'required' }
    ]);
  }

  const isActive = payload?.is_active === undefined ? 1 : (normalizeBoolean(payload.is_active) ? 1 : 0);

  const result = await query(
    `
    INSERT INTO service_items (category_id, title, description, content, is_active)
    VALUES (?, ?, ?, ?, ?)
  `,
    [
      category.id,
      title,
      payload?.description ? String(payload.description).trim() : null,
      payload?.content ? String(payload.content).trim() : null,
      isActive
    ]
  );

  const created = await getItem(category.id, result.insertId, { includeInactive: true });

  if (logAuditSafe && userId) {
    await logAuditSafe({
      module: 'servicios',
      action: 'create_item',
      entity: 'service_items',
      entityId: created.id,
      userId,
      before: null,
      after: created,
      req
    });
  }

  return created;
}

async function updateItem(slug, id, payload, userId = null, req = null) {
  const category = await getCategoryBySlug(slug, { includeInactive: false });
  const before = await getItem(category.id, id, { includeInactive: true });

  const updates = {};
  const allowed = ['title', 'description', 'content', 'is_active'];

  for (const k of allowed) {
    if (payload?.[k] !== undefined) updates[k] = payload[k];
  }

  const fields = Object.keys(updates);
  if (!fields.length) return before;

  const setClauses = [];
  const values = [];

  for (const f of fields) {
    if (f === 'is_active') {
      setClauses.push('is_active = ?');
      values.push(normalizeBoolean(updates[f]) ? 1 : 0);
      continue;
    }

    if (f === 'title') {
      const t = String(updates[f] ?? '').trim();
      if (!t) {
        throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, [
          { field: 'title', where: 'body', issue: 'required' }
        ]);
      }
      setClauses.push('title = ?');
      values.push(t);
      continue;
    }

    setClauses.push(`${f} = ?`);
    const v = updates[f];
    values.push(v === '' ? null : (v ?? null));
  }

  setClauses.push('updated_at = NOW()');

  await query(
    `
    UPDATE service_items
    SET ${setClauses.join(', ')}
    WHERE id = ? AND category_id = ?
  `,
    [...values, Number(id), Number(category.id)]
  );

  const after = await getItem(category.id, id, { includeInactive: true });

  if (logAuditSafe && userId) {
    await logAuditSafe({
      module: 'servicios',
      action: 'update_item',
      entity: 'service_items',
      entityId: after.id,
      userId,
      before,
      after,
      req
    });
  }

  return after;
}

async function deleteItem(slug, id, userId = null, req = null) {
  const category = await getCategoryBySlug(slug, { includeInactive: false });
  const before = await getItem(category.id, id, { includeInactive: true });

  if (!before.is_active) {
    return { id: Number(id), deleted: true };
  }

  await query(
    `
    UPDATE service_items
    SET is_active = 0, updated_at = NOW()
    WHERE id = ? AND category_id = ?
  `,
    [Number(id), Number(category.id)]
  );

  if (logAuditSafe && userId) {
    await logAuditSafe({
      module: 'servicios',
      action: 'delete_item',
      entity: 'service_items',
      entityId: Number(id),
      userId,
      before,
      after: { ...before, is_active: false },
      req
    });
  }

  return { id: Number(id), deleted: true };
}

module.exports = {
  ALLOWED_SLUGS,
  normalizeSlug,

  listCategories,
  getCategoryBySlug,
  getCategoryWithItems,

  listItemsByCategory,

  createItem,
  updateItem,
  deleteItem
};
