const { ok } = require('../../utils/responses');
const enfermeriaService = require('./enfermeria.service');

async function createVital(req, res, next) {
  try {
    const data = await enfermeriaService.createVital(Number(req.params.residentId), req.user.id, req.body, req);
    return ok(res, data, 201);
  } catch (err) { return next(err); }
}

async function createMedication(req, res, next) {
  try {
    const data = await enfermeriaService.createMedication(Number(req.params.residentId), req.user.id, req.body, req);
    return ok(res, data, 201);
  } catch (err) { return next(err); }
}

async function createObservation(req, res, next) {
  try {
    const data = await enfermeriaService.createObservation(Number(req.params.residentId), req.user.id, req.body, req);
    return ok(res, data, 201);
  } catch (err) { return next(err); }
}

async function resolveObservation(req, res, next) {
  try {
    const data = await enfermeriaService.resolveObservation(Number(req.params.id), req.user.id, req);
    return ok(res, data);
  } catch (err) { return next(err); }
}

async function today(req, res, next) {
  try {
    const data = await enfermeriaService.todaySummary();
    return ok(res, data);
  } catch (err) { return next(err); }
}

module.exports = { createVital, createMedication, createObservation, resolveObservation, today };
