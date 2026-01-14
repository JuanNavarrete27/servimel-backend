// src/modules/fisioterapia/fisioterapia.validators.js
// ============================================================
// SERVIMEL — Fisioterapia Validators
// ============================================================

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

exports.validateResidentId = (req, _res, next) => {
  const raw = req.params.residentId;
  const n = Number.parseInt(String(raw), 10);

  if (!Number.isFinite(n) || n <= 0) {
    return next(httpError(400, 'BAD_REQUEST', 'residentId inválido'));
  }

  req.params.residentId = n;
  return next();
};

exports.validatePaging = (req, _res, next) => {
  const limit = req.query.limit;
  const offset = req.query.offset;

  if (limit !== undefined) {
    const n = Number.parseInt(String(limit), 10);
    if (!Number.isFinite(n) || n <= 0 || n > 200) {
      return next(httpError(400, 'BAD_REQUEST', 'limit inválido (1..200)'));
    }
  }

  if (offset !== undefined) {
    const n = Number.parseInt(String(offset), 10);
    if (!Number.isFinite(n) || n < 0) {
      return next(httpError(400, 'BAD_REQUEST', 'offset inválido (>=0)'));
    }
  }

  return next();
};
