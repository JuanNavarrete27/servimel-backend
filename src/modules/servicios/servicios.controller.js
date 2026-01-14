// src/modules/servicios/servicios.controller.js
// ============================================================
// SERVIMEL — Servicios Controller
// ✅ Respeta roles (includeInactive SOLO admin)
// ✅ Respuestas estables para frontend:
//    - GET /servicios/:slug => { category, items, page, limit, total }
//    - GET /servicios/:slug/items => { page, limit, total, items }
// ============================================================

const { ok } = require('../../utils/responses');
const serviciosService = require('./servicios.service');

function toBool(v) {
  return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
}

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

async function listCategories(req, res, next) {
  try {
    const data = await serviciosService.listCategories();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getCategory(req, res, next) {
  try {
    const slug = req.params.slug;

    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 20);
    const q = req.query.q ? String(req.query.q) : undefined;

    // ✅ SOLO admin puede pedir includeInactive
    const includeInactive =
      req.user?.role === 'admin' ? toBool(req.query.includeInactive) : false;

    const category = await serviciosService.getCategoryBySlug(slug, { includeInactive });

    const itemsRes = await serviciosService.listItemsByCategory(category.id, {
      page,
      limit,
      q,
      includeInactive
    });

    // ✅ shape estable: category + items + meta
    return ok(res, {
      category,
      items: itemsRes.items,
      page: itemsRes.page,
      limit: itemsRes.limit,
      total: itemsRes.total
    });
  } catch (err) {
    return next(err);
  }
}

async function listItems(req, res, next) {
  try {
    const slug = req.params.slug;

    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 20);
    const q = req.query.q ? String(req.query.q) : undefined;

    // ✅ SOLO admin puede pedir includeInactive
    const includeInactive =
      req.user?.role === 'admin' ? toBool(req.query.includeInactive) : false;

    const category = await serviciosService.getCategoryBySlug(slug, { includeInactive });

    const data = await serviciosService.listItemsByCategory(category.id, {
      page,
      limit,
      q,
      includeInactive
    });

    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const userId = req.user?.id ?? null;
    const data = await serviciosService.createItem(req.params.slug, req.body, userId, req);
    return ok(res, data, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const userId = req.user?.id ?? null;
    const data = await serviciosService.updateItem(
      req.params.slug,
      Number(req.params.id),
      req.body,
      userId,
      req
    );
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const userId = req.user?.id ?? null;
    const data = await serviciosService.deleteItem(
      req.params.slug,
      Number(req.params.id),
      userId,
      req
    );
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listCategories,
  getCategory,
  listItems,
  createItem,
  updateItem,
  deleteItem
};
