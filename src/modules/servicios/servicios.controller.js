const { ok } = require('../../utils/responses');
const serviciosService = require('./servicios.service');

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
    const data = await serviciosService.getCategoryWithItems(req.params.slug);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function listItems(req, res, next) {
  try {
    const category = await serviciosService.getCategoryBySlug(req.params.slug);
    const data = await serviciosService.listItemsByCategory(category.id, req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const data = await serviciosService.createItem(req.params.slug, req.body);
    return ok(res, data, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const data = await serviciosService.updateItem(req.params.slug, Number(req.params.id), req.body);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const data = await serviciosService.deleteItem(req.params.slug, Number(req.params.id));
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
