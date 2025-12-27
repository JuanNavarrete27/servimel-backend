const { ok } = require('../../utils/responses');
const dashboardService = require('./dashboard.service');

async function kpis(req, res, next) {
  try {
    const data = await dashboardService.getKpis();
    return ok(res, data);
  } catch (err) { return next(err); }
}

async function quick(req, res, next) {
  try {
    const data = await dashboardService.getQuick();
    return ok(res, data);
  } catch (err) { return next(err); }
}

module.exports = { kpis, quick };
