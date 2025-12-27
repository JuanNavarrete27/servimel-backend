function ok(res, data = null, status = 200) {
  return res.status(status).json({ ok: true, data });
}

function fail(res, code, message, status = 400, details = undefined) {
  const payload = { ok: false, error: { code, message } };
  if (details !== undefined) payload.error.details = details;
  return res.status(status).json(payload);
}

class AppError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

module.exports = { ok, fail, AppError };
