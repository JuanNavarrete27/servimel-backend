const { ok } = require('../../utils/responses');
const settingsService = require('./settings.service');

async function me(req, res, next) {
  try {
    const data = await settingsService.getMySettings(req.user.id);
    return ok(res, data);
  } catch (err) { return next(err); }
}

async function updateMe(req, res, next) {
  try {
    const data = await settingsService.updateMySettings(req.user.id, req.body, req);
    return ok(res, data);
  } catch (err) { return next(err); }
}

module.exports = { me, updateMe };
