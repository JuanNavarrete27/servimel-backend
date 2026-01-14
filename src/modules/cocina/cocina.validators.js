// src/modules/cocina/cocina.validators.js
// ============================================================
// Cocina Validators (simple y firme)
// ============================================================

const { AppError } = require('../../utils/responses');

function isIsoDate(x) {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function validateIdParam(req, _res, next) {
  const id = Number(req.params.id);
  if (!id || id <= 0) return next(new AppError('id inválido', 400));
  next();
}

function validateWeekStartQuery(req, _res, next) {
  const weekStart = String(req.query.weekStart || '');
  if (!isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));
  next();
}

function validateViewerQuery(req, _res, next) {
  const residentId = Number(req.query.residentId);
  const weekStart = String(req.query.weekStart || '');
  if (!residentId || residentId <= 0) return next(new AppError('residentId inválido', 400));
  if (!isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));
  next();
}

function validateCreateMenu(req, _res, next) {
  const b = req.body || {};
  const weekStart = String(b.weekStart || '');
  if (!isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));

  if (b.weekEnd && !isIsoDate(String(b.weekEnd))) {
    return next(new AppError('weekEnd inválido (YYYY-MM-DD)', 400));
  }
  next();
}

function validateUpdateMenu(req, _res, next) {
  const b = req.body || {};
  if (!b.weekStart || !isIsoDate(String(b.weekStart))) {
    return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));
  }
  if (b.weekEnd && !isIsoDate(String(b.weekEnd))) {
    return next(new AppError('weekEnd inválido (YYYY-MM-DD)', 400));
  }
  if (b.menuJson && typeof b.menuJson !== 'object') {
    return next(new AppError('menuJson debe ser un objeto JSON', 400));
  }
  next();
}

function validateSaveAssignments(req, _res, next) {
  const b = req.body || {};
  const weekStart = String(b.weekStart || '');
  if (!isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));

  if (!Array.isArray(b.assignments)) return next(new AppError('assignments debe ser array', 400));
  next();
}

module.exports = {
  validateIdParam,
  validateWeekStartQuery,
  validateViewerQuery,
  validateCreateMenu,
  validateUpdateMenu,
  validateSaveAssignments,
};
