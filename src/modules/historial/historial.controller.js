const { ok } = require('../../utils/responses');
const historialService = require('./historial.service');

async function listByResident(req, res, next) {
  try {
    const data = await historialService.listTimelineByResident(Number(req.params.residentId), {
      page: req.query.page,
      limit: req.query.limit,
      preset: req.query.preset, // hoy|7d|all
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      type: req.query.type
    });
    return ok(res, data);
  } catch (err) { return next(err); }
}

async function getEvent(req, res, next) {
  try {
    const data = await historialService.getTimelineEvent(Number(req.params.eventId));
    return ok(res, data);
  } catch (err) { return next(err); }
}

module.exports = { listByResident, getEvent };
