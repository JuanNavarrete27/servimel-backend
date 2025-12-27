const { ok } = require('../../utils/responses');
const residentesService = require('./residentes.service');

async function list(req, res, next) {
  try {
    const data = await residentesService.listResidents(req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await residentesService.getResident(Number(req.params.id));
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await residentesService.createResident(req.body, req.user.id, req);
    return ok(res, data, 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await residentesService.updateResident(Number(req.params.id), req.body, req.user.id, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const data = await residentesService.deactivateResident(Number(req.params.id), req.user.id, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getById, create, update, deactivate };
