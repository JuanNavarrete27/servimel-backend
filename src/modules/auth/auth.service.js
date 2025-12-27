// src/modules/auth/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, tx } = require('../../config/db');
const { env } = require('../../config/env');
const { AppError } = require('../../utils/responses');
const { logAudit } = require('../auditoria/auditoria.service');

function signToken(user) {
  const secret = env('JWT_SECRET');
  const expiresIn = env('JWT_EXPIRES_IN', '7d');
  return jwt.sign(
    { role: user.role },
    secret,
    { subject: String(user.id), expiresIn }
  );
}

async function isFirstUser() {
  const rows = await query('SELECT COUNT(*) AS c FROM users');
  return (rows[0]?.c || 0) === 0;
}

async function register({ email, password, first_name, last_name, phone, avatar_url, role }, req) {
  const normalizedEmail = String(email).trim().toLowerCase();

  // Basic uniqueness
  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (existing.length) throw new AppError('AUTH_EMAIL_TAKEN', 'Email already in use', 409);

  // Role rules:
  // - default enfermeria
  // - allow "admin" ONLY for the very first user (bootstrap)
  let finalRole = 'enfermeria';
  if (role && (await isFirstUser())) {
    const r = String(role);
    if (['admin', 'enfermeria', 'medico'].includes(r)) finalRole = r;
  }

  const hash = await bcrypt.hash(String(password), 10);

  const userId = await tx(async (conn) => {
    const [r] = await conn.execute(`
      INSERT INTO users (role, email, password_hash, first_name, last_name, phone, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [finalRole, normalizedEmail, hash, first_name || null, last_name || null, phone || null, avatar_url || null]);

    // Default settings
    await conn.execute(`
      INSERT INTO user_settings (user_id, theme, high_contrast, compact_mode, animations, dna_opacity)
      VALUES (?, 'dark', 0, 0, 1, 0.20)
    `, [r.insertId]);

    return r.insertId;
  });

  await logAudit({
    module: 'auth',
    action: 'register',
    entity: 'users',
    entityId: userId,
    userId,
    before: null,
    after: { email: normalizedEmail, role: finalRole, first_name, last_name, phone, avatar_url },
    req
  });

  const user = await query(`
    SELECT id, role, email, first_name, last_name, phone, avatar_url, created_at, updated_at
    FROM users WHERE id = ? LIMIT 1
  `, [userId]);

  const token = signToken(user[0]);
  return { token, user: user[0] };
}

async function login({ email, password }, req) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const rows = await query(`
    SELECT id, role, email, password_hash, first_name, last_name, phone, avatar_url, is_active
    FROM users WHERE email = ? LIMIT 1
  `, [normalizedEmail]);

  if (!rows.length) throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);

  const user = rows[0];
  if (!user.is_active) throw new AppError('AUTH_USER_DISABLED', 'User is disabled', 403);

  const passOk = await bcrypt.compare(String(password), user.password_hash);
  if (!passOk) throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);

  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  await logAudit({
    module: 'auth',
    action: 'login',
    entity: 'users',
    entityId: user.id,
    userId: user.id,
    before: null,
    after: { email: normalizedEmail },
    req
  });

  const token = signToken(user);
  const safeUser = {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    avatar_url: user.avatar_url
  };
  return { token, user: safeUser };
}

async function logout(userId, req) {
  // Stateless: just log audit event
  await logAudit({
    module: 'auth',
    action: 'logout',
    entity: 'users',
    entityId: userId,
    userId,
    before: null,
    after: null,
    req
  });
  return { logged_out: true };
}

// ✅ NUEVO: /auth/me (para perfil del usuario logueado)
async function me(userId, req) {
  const rows = await query(`
    SELECT id, role, email, first_name, last_name, phone, avatar_url, is_active,
           created_at, updated_at, last_login_at
    FROM users
    WHERE id = ? LIMIT 1
  `, [userId]);

  if (!rows.length) throw new AppError('NOT_FOUND', 'User not found', 404);
  if (!rows[0].is_active) throw new AppError('AUTH_USER_DISABLED', 'User is disabled', 403);

  // (Opcional) audit — útil para trazabilidad
  await logAudit({
    module: 'auth',
    action: 'me',
    entity: 'users',
    entityId: userId,
    userId,
    before: null,
    after: null,
    req
  });

  return rows[0];
}

module.exports = { register, login, logout, me };
