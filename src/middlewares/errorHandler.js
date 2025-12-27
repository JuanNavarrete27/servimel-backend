const { fail } = require('../utils/responses');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const code = err.code || 'INTERNAL_ERROR';
  const status = err.status || 500;
  const message = err.message || 'Unexpected error';
  const details = err.details;

  // Basic logging (keep it simple; swap to Winston later)
  // eslint-disable-next-line no-console
  console.error('[ERROR]', {
    code,
    status,
    message,
    path: req.path,
    method: req.method
  });

  return fail(res, code, message, status, details);
}

module.exports = { errorHandler };
