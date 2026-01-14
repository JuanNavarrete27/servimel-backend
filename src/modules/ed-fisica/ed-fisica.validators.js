// src/modules/ed-fisica/ed-fisica.validators.js
// ============================================================
// SERVIMEL — Educación Física Validators
// ✅ Más robusto pero sin romper tu stack
// - weekStart/dateIso ISO estrictos
// - Acepta weekStart vacío en query (controller lo normaliza)
// - Valida payload mínimo de days y logs (status permitido)
// ============================================================

const { AppError } = require('../../utils/responses');

function isIsoDate(x) {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function validatePlanQuery(req, _res, next) {
  const residentId = Number(req.query.residentId);
  const weekStart = String(req.query.weekStart || '').trim();

  if (!residentId || residentId <= 0) return next(new AppError('residentId inválido', 400));

  // weekStart puede venir vacío -> controller lo normaliza
  if (weekStart && !isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));

  // opcional: dateIso (para ayudar al controller)
  const dateIso = String(req.query.dateIso || req.query.date || '').trim();
  if (dateIso && !isIsoDate(dateIso)) return next(new AppError('dateIso inválido (YYYY-MM-DD)', 400));

  next();
}

function validateLogsQuery(req, _res, next) {
  const residentId = Number(req.query.residentId);
  const weekStart = String(req.query.weekStart || '').trim();

  if (!residentId || residentId <= 0) return next(new AppError('residentId inválido', 400));

  // weekStart puede venir vacío -> controller lo normaliza
  if (weekStart && !isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));

  const dateIso = String(req.query.dateIso || req.query.date || '').trim();
  if (dateIso && !isIsoDate(dateIso)) return next(new AppError('dateIso inválido (YYYY-MM-DD)', 400));

  next();
}

function validatePlanId(req, _res, next) {
  const id = Number(req.params.id);
  if (!id || id <= 0) return next(new AppError('id inválido', 400));
  next();
}

function validateCreatePlan(req, _res, next) {
  const b = req.body || {};
  const residentId = Number(b.residentId);
  const weekStart = String(b.weekStart || '').trim();

  if (!residentId || residentId <= 0) return next(new AppError('residentId inválido', 400));
  if (!isIsoDate(weekStart)) return next(new AppError('weekStart inválido (YYYY-MM-DD)', 400));

  // days opcional, pero si viene debe ser array
  if (b.days !== undefined && !Array.isArray(b.days)) return next(new AppError('days debe ser array', 400));

  next();
}

function validateUpsertPlan(req, _res, next) {
  const b = req.body || {};

  if (b.days !== undefined && !Array.isArray(b.days)) return next(new AppError('days debe ser array', 400));

  // si days viene, validamos estructura mínima sin ser estrictos
  if (Array.isArray(b.days)) {
    for (const d of b.days) {
      if (d == null || typeof d !== 'object') return next(new AppError('days debe contener objetos', 400));
      if (d.dateIso && !isIsoDate(String(d.dateIso))) return next(new AppError('days[].dateIso inválido (YYYY-MM-DD)', 400));
      if (d.items && !Array.isArray(d.items)) return next(new AppError('days[].items debe ser array', 400));
    }
  }

  next();
}

function validateCreateLog(req, _res, next) {
  const b = req.body || {};
  const residentId = Number(b.residentId);
  const dateIso = String(b.dateIso || '').trim();
  const status = String(b.status || '').trim().toLowerCase();

  if (!residentId || residentId <= 0) return next(new AppError('residentId inválido', 400));
  if (!isIsoDate(dateIso)) return next(new AppError('dateIso inválido (YYYY-MM-DD)', 400));

  // status opcional pero si viene, debe ser uno permitido
  if (status) {
    const allowed = new Set(['cumplida', 'omitida', 'done', 'completed', 'skipped', 'cancelada', 'canceled']);
    if (!allowed.has(status)) return next(new AppError('status inválido (cumplida|omitida)', 400));
  }

  next();
}

module.exports = {
  validatePlanQuery,
  validateLogsQuery,
  validatePlanId,
  validateCreatePlan,
  validateUpsertPlan,
  validateCreateLog,
};
