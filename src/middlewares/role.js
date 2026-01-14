// src/middlewares/role.js
const { AppError } = require('../utils/responses');

function normalizeRole(v) {
  return String(v || '').trim().toLowerCase();
}

function requireRole(...roles) {
  const allowed = roles.map(normalizeRole).filter(Boolean);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('AUTH_UNAUTHORIZED', 'Not authenticated', 401));
    }

    // ✅ FIX: tu code usa req.user.role pero en otros lugares puede venir como "rol"
    const userRole = normalizeRole(req.user.role ?? req.user.rol);

    if (!userRole) {
      return next(new AppError('AUTH_FORBIDDEN', 'Insufficient role', 403));
    }

    if (!allowed.includes(userRole)) {
      return next(new AppError('AUTH_FORBIDDEN', 'Insufficient role', 403));
    }

    return next();
  };
}

module.exports = { requireRole };
