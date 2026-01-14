// src/modules/yoga/yoga.validators.js
// ============================================================
// SERVIMEL — Yoga Validators (middlewares)
// ============================================================

const { AppError } = require('../../utils/responses');

function isISODate(dateStr) {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function parseISODate(dateStr) {
  // construye Date en UTC-ish consistente
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isMonday(dateStr) {
  const d = parseISODate(dateStr);
  if (!d) return false;
  // getDay(): 0=domingo,1=lunes
  return d.getDay() === 1;
}

function validateResidentParam(req, _res, next) {
  const raw = req.params.residentId;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return next(new AppError('residentId inválido', 400));
  req.params.residentId = String(id);
  next();
}

function validateSequenceIdParam(req, _res, next) {
  const raw = req.params.id;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return next(new AppError('id inválido', 400));
  req.params.id = String(id);
  next();
}

function validateWeekStartQuery(req, _res, next) {
  const { weekStart } = req.query;

  if (!weekStart || typeof weekStart !== 'string') {
    return next(new AppError('Falta weekStart (query) en formato YYYY-MM-DD', 400));
  }
  if (!isISODate(weekStart)) {
    return next(new AppError('weekStart inválido. Usá YYYY-MM-DD', 400));
  }
  if (!isMonday(weekStart)) {
    return next(new AppError('weekStart debe ser un lunes (inicio de semana)', 400));
  }

  next();
}

function validateSequenceBody(req, _res, next) {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const tone = String(body.tone || 'suave').trim().toLowerCase();
  const minutes = Number(body.minutes ?? 30);
  const items = body.items;

  if (!name || name.length < 2 || name.length > 80) {
    return next(new AppError('name requerido (2–80 chars)', 400));
  }
  if (!['suave', 'medio', 'intenso'].includes(tone)) {
    return next(new AppError("tone inválido. Valores: 'suave' | 'medio' | 'intenso'", 400));
  }
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) {
    return next(new AppError('minutes inválido (5–180)', 400));
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 40) {
    return next(new AppError('items requerido (array 1–40)', 400));
  }

  for (const it of items) {
    const itemId = Number(it.itemId);
    const title = String(it.title || '').trim();
    const m = it.minutes == null ? null : Number(it.minutes);

    if (!Number.isFinite(itemId) || itemId <= 0) {
      return next(new AppError('items[].itemId inválido', 400));
    }
    if (!title || title.length > 120) {
      return next(new AppError('items[].title requerido (1–120)', 400));
    }
    if (m != null && (!Number.isFinite(m) || m < 0 || m > 180)) {
      return next(new AppError('items[].minutes inválido (0–180)', 400));
    }
  }

  next();
}

function validatePlanBody(req, _res, next) {
  const body = req.body || {};
  const plan = body.plan ?? body; // acepto {plan:{...}} o directo
  const days = plan.days;

  if (!Array.isArray(days) || days.length !== 7) {
    return next(new AppError('Plan inválido: days debe existir y tener 7 elementos', 400));
  }

  for (const d of days) {
    const dateISO = d.dateISO;
    if (!isISODate(dateISO)) {
      return next(new AppError('Plan inválido: days[].dateISO debe ser YYYY-MM-DD', 400));
    }
    if (d.time != null && typeof d.time !== 'string') {
      return next(new AppError('Plan inválido: days[].time debe ser string', 400));
    }
    if (d.minutes != null && (!Number.isFinite(Number(d.minutes)) || Number(d.minutes) < 0 || Number(d.minutes) > 240)) {
      return next(new AppError('Plan inválido: days[].minutes fuera de rango', 400));
    }
    if (d.intensity != null) {
      const t = String(d.intensity).toLowerCase();
      if (!['suave', 'medio', 'intenso'].includes(t)) {
        return next(new AppError("Plan inválido: days[].intensity debe ser 'suave'|'medio'|'intenso'", 400));
      }
    }
    if (d.sequenceId != null && typeof d.sequenceId !== 'string') {
      return next(new AppError('Plan inválido: days[].sequenceId debe ser string o null', 400));
    }
    if (d.notes != null && typeof d.notes !== 'string') {
      return next(new AppError('Plan inválido: days[].notes debe ser string', 400));
    }
  }

  next();
}

module.exports = {
  validateResidentParam,
  validateSequenceIdParam,
  validateWeekStartQuery,
  validateSequenceBody,
  validatePlanBody,
};
