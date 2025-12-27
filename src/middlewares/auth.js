const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AppError } = require('../utils/responses');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return next(new AppError('AUTH_UNAUTHORIZED', 'Missing or invalid Authorization header', 401));
  }

  try {
    const payload = jwt.verify(token, env('JWT_SECRET'));
    req.user = {
      id: payload.sub,
      role: payload.role
    };
    return next();
  } catch (e) {
    return next(new AppError('AUTH_UNAUTHORIZED', 'Invalid or expired token', 401));
  }
}

module.exports = { authRequired };
