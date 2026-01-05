const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');

const ALLOWED_SLUGS = [
  'medicina-general',
  'yoga',
  'fisioterapia',
  'cocina',
  'ed-fisica'
];

function normalizeSlug(slug) {
  if (!slug) return null;
  const value = String(slug).trim().toLowerCase();
  if (ALLOWED_SLUGS.includes(value)) return value;
  // alias simples por si el frontend envía variantes
  const aliases = {
    'medicina_general': 'medicina-general',
    'medicina general': 'medicina-general',
    'educacion-fisica': 'ed-fisica',
    'educacion fisica': 'ed-fisica',
    'ed-fisica': 'ed-fisica',
    'ed fisica': 'ed-fisica'
  };
  return aliases[value] || null;
}

async function getCategoryBySlug(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    throw new AppError('SERVICE_NOT_FOUND', 'Servicio no encontrado', 404);
  }

  const rows = await query(
    `SELECT id, slug, name, description, is_active, created_at, updated_at
     FROM service_categories
     WHERE slug = ? AND is_active = 1
     LIMIT 1`,
    [normalized]
  );

  if (!rows.length) {
    throw new AppError('SERVICE_NOT_FOUND', 'Servicio no encontrado', 404);
  }

  return rows[0];
}

async function listCategories() {
  return query(
    `SELECT slug, name, description, is_active, created_at, updated_at
     FROM service_categories
     WHERE is_active = 1
     ORDER BY name ASC`
  );
}

async function listItemsByCategory(categoryId, { page = 1, limit = 20, q, includeInactive = false }) {
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const where = ['category_id = ?'];
  const params = [categoryId];

  if (!includeInactive) {
    where.push('is_active = 1');
  }

  if (q) {
    where.push('(title LIKE ? OR description LIKE ? OR content LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const items = await query(
    `SELECT id, title, description, content, is_active, created_at, updated_at
     FROM service_items
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  const total = await query(
    `SELECT COUNT(*) AS total
     FROM service_items
     ${whereSql}`,
    params
  );

  return {
    page: p,
    limit: l,
    total: total[0]?.total || 0,
    items
  };
}

async function getCategoryWithItems(slug) {
  const category = await getCategoryBySlug(slug);
  const items = await listItemsByCategory(category.id, { includeInactive: false });
  return { category, items: items.items };
}

async function getItem(categoryId, id) {
  const rows = await query(
    `SELECT id, category_id, title, description, content, is_active, created_at, updated_at
     FROM service_items
     WHERE id = ? AND category_id = ?
     LIMIT 1`,
    [id, categoryId]
  );

  if (!rows.length) {
    throw new AppError('ITEM_NOT_FOUND', 'Item no encontrado', 404);
  }

  return rows[0];
}

async function createItem(slug, payload) {
  const category = await getCategoryBySlug(slug);
  const isActive = payload.is_active === undefined ? 1 : normalizeBoolean(payload.is_active) ? 1 : 0;

  const result = await query(
    `INSERT INTO service_items
      (category_id, title, description, content, is_active)
     VALUES (?, ?, ?, ?, ?)`
    , [
      category.id,
      payload.title,
      payload.description || null,
      payload.content || null,
      isActive
    ]
  );

  return getItem(category.id, result.insertId);
}

async function updateItem(slug, id, payload) {
  const category = await getCategoryBySlug(slug);
  const current = await getItem(category.id, id);

  const updates = {};
  const allowed = ['title', 'description', 'content', 'is_active'];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) updates[key] = payload[key];
  });

  const fields = Object.keys(updates);
  if (!fields.length) return current;

  const setClauses = [];
  const values = [];

  for (const field of fields) {
    if (field === 'is_active') {
      setClauses.push('is_active = ?');
      values.push(normalizeBoolean(updates[field]) ? 1 : 0);
    } else {
      setClauses.push(`${field} = ?`);
      values.push(updates[field] || null);
    }
  }

  setClauses.push('updated_at = NOW()');

  await query(
    `UPDATE service_items
     SET ${setClauses.join(', ')}
     WHERE id = ? AND category_id = ?`,
    [...values, id, category.id]
  );

  return getItem(category.id, id);
}

async function deleteItem(slug, id) {
  const category = await getCategoryBySlug(slug);
  await getItem(category.id, id);

  await query(
    `UPDATE service_items
     SET is_active = 0, updated_at = NOW()
     WHERE id = ? AND category_id = ?`,
    [id, category.id]
  );

  return { id: Number(id), deleted: true };
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
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
