const { ok } = require('../../utils/responses');
const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body, req);
    return ok(res, data, 201);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    const data = await authService.logout(req.user.id, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

// ✅ NUEVO: /auth/me
async function me(req, res, next) {
  try {
    const data = await authService.me(req.user.id, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, me };
