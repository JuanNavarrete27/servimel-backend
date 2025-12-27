const { ok } = require('../../utils/responses');
const usersService = require('./users.service');

async function me(req, res, next) {
  try {
    const data = await usersService.getMe(req.user.id);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const data = await usersService.updateMe(req.user.id, req.body, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const data = await usersService.changePassword(req.user.id, req.body, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

// ✅ SETTINGS (ME)
async function mySettings(req, res, next) {
  try {
    const data = await usersService.getMySettings(req.user.id);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function updateMySettings(req, res, next) {
  try {
    const data = await usersService.updateMySettings(req.user.id, req.body, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

// Admin
async function list(req, res, next) {
  try {
    const data = await usersService.listUsers(req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function adminCreate(req, res, next) {
  try {
    const data = await usersService.adminCreateUser(req.body, req.user.id, req);
    return ok(res, data, 201);
  } catch (err) {
    return next(err);
  }
}

async function adminUpdate(req, res, next) {
  try {
    const data = await usersService.adminUpdateUser(Number(req.params.id), req.body, req.user.id, req);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  me,
  updateMe,
  changePassword,

  // ✅ settings
  mySettings,
  updateMySettings,

  // admin
  list,
  adminCreate,
  adminUpdate
};
