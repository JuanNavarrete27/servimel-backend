const { ok } = require('../../utils/responses');
const auditoriaService = require('./auditoria.service');

async function list(req, res, next) {
  try {
    const data = await auditoriaService.listAudits({
      page: req.query.page,
      limit: req.query.limit,
      module: req.query.module,
      action: req.query.action,
      entity: req.query.entity,
      userId: req.query.userId
    });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };
