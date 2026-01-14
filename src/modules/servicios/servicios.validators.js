// src/modules/servicios/servicios.validators.js
// ============================================================
// SERVIMEL — Servicios (validators + normalizers)
// ✅ Normaliza slug (incluye aliases)
// ✅ Sanitiza query params (page/limit/q/includeInactive)
// ✅ Sanitiza payloads (create/update) con trims + límites
// ✅ Errores consistentes (AppError)
// ============================================================

const { AppError } = require('../../utils/responses');

const ALLOWED_SLUGS = [
  'medicina-general',
  'yoga',
  'fisioterapia',
  'cocina',
  'ed-fisica'
];

const SLUG_ALIASES = {
  // medicina general
  medicina_general: 'medicina-general',
  'medicina general': 'medicina-general',
  medicina: 'medicina-general',

  // educación física
  'educacion-fisica': 'ed-fisica',
  'educacion fisica': 'ed-fisica',
  'educación-física': 'ed-fisica',
  'educación física': 'ed-fisica',
  'ed fisica': 'ed-fisica',
  ed_fisica: 'ed-fisica',
  edfisica: 'ed-fisica',

  // fisioterapia
  fisio: 'fisioterapia'
};

function normalizeSlug(slug) {
  if (!slug) return null;
  const raw = String(slug).trim().toLowerCase().replace(/\/+$/, '');
  const normalized = SLUG_ALIASES[raw] || raw;
  return ALLOWED_SLUGS.includes(normalized) ? normalized : null;
}

function assertSlug(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    throw new AppError('SERVICE_NOT_FOUND', 'Servicio no encontrado', 404);
  }
  return normalized;
}

function normalizeBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

function trimOrNull(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function trimOrEmpty(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function assertMax(field, val, max) {
  if (val === undefined || val === null) return;
  const s = String(val);
  if (s.length > max) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      [{ field, where: 'body', issue: `max_${max}` }]
    );
  }
}

function sanitizeListQuery(qs = {}) {
  const page = Math.max(1, Number.parseInt(qs.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(qs.limit, 10) || 20));
  const q = trimOrEmpty(qs.q);
  const includeInactive = normalizeBoolean(qs.includeInactive);

  // q max 190
  if (q && q.length > 190) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      [{ field: 'q', where: 'query', issue: 'max_190' }]
    );
  }

  return { page, limit, q: q || undefined, includeInactive };
}

function sanitizeCreatePayload(body = {}) {
  const title = trimOrEmpty(body.title);
  if (!title) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      [{ field: 'title', where: 'body', issue: 'required' }]
    );
  }

  assertMax('title', title, 190);

  const description = trimOrNull(body.description);
  if (description !== undefined) assertMax('description', description, 2000);

  const content = body.content === undefined ? undefined : trimOrNull(body.content);

  const is_active =
    body.is_active === undefined ? 1 : (normalizeBoolean(body.is_active) ? 1 : 0);

  return {
    title,
    description: description === undefined ? null : description,
    content: content === undefined ? null : content,
    is_active
  };
}

function sanitizeUpdatePayload(body = {}) {
  const updates = {};

  if (body.title !== undefined) {
    const title = trimOrEmpty(body.title);
    if (!title) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        [{ field: 'title', where: 'body', issue: 'required' }]
      );
    }
    assertMax('title', title, 190);
    updates.title = title;
  }

  if (body.description !== undefined) {
    const description = trimOrNull(body.description);
    assertMax('description', description, 2000);
    updates.description = description;
  }

  if (body.content !== undefined) {
    updates.content = trimOrNull(body.content);
  }

  if (body.is_active !== undefined) {
    updates.is_active = normalizeBoolean(body.is_active) ? 1 : 0;
  }

  return updates;
}

// ------------------------------------------------------------
// (Opcional) Middlewares listos para usar en routes
// ------------------------------------------------------------
function validateSlug(req, _res, next) {
  try {
    req.params.slug = assertSlug(req.params.slug);
    return next();
  } catch (e) {
    return next(e);
  }
}

function sanitizeList(req, _res, next) {
  try {
    req.query = { ...req.query, ...sanitizeListQuery(req.query) };
    return next();
  } catch (e) {
    return next(e);
  }
}

function sanitizeCreate(req, _res, next) {
  try {
    req.body = sanitizeCreatePayload(req.body);
    return next();
  } catch (e) {
    return next(e);
  }
}

function sanitizeUpdate(req, _res, next) {
  try {
    req.body = sanitizeUpdatePayload(req.body);
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  ALLOWED_SLUGS,
  normalizeSlug,
  assertSlug,

  sanitizeListQuery,
  sanitizeCreatePayload,
  sanitizeUpdatePayload,
  normalizeBoolean,

  // middlewares opcionales
  validateSlug,
  sanitizeList,
  sanitizeCreate,
  sanitizeUpdate
};
