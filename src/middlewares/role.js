const { AppError } = require('../utils/responses');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('AUTH_UNAUTHORIZED', 'Not authenticated', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('AUTH_FORBIDDEN', 'Insufficient role', 403));
    }
    return next();
  };
}

module.exports = { requireRole };
