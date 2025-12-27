const bcrypt = require('bcryptjs');
const { query, tx } = require('../../config/db');
const { AppError } = require('../../utils/responses');
const { logAudit } = require('../auditoria/auditoria.service');

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function toNullIfEmpty(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

// ---------------------------------------------
// Me
// ---------------------------------------------
async function getMe(userId) {
  const rows = await query(
    `
    SELECT id, role, email, first_name, last_name, phone, avatar_url, is_active,
           created_at, updated_at, last_login_at
    FROM users
    WHERE id = ? LIMIT 1
  `,
    [userId]
  );

  if (!rows.length) throw new AppError('NOT_FOUND', 'User not found', 404);

  // Normalización simple (por si DB tiene nulls)
  const u = rows[0];
  return {
    ...u,
    email: u.email ? String(u.email).trim().toLowerCase() : u.email,
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    phone: u.phone ?? null,
    avatar_url: u.avatar_url ?? null,
    is_active: typeof u.is_active === 'boolean' ? u.is_active : Number(u.is_active) === 1
  };
}

async function updateMe(userId, payload, req) {
  const before = await getMe(userId);

  const allowed = ['first_name', 'last_name', 'phone', 'email', 'avatar_url'];
  const updates = {};

  for (const k of allowed) {
    if (payload[k] !== undefined) updates[k] = payload[k];
  }

  // Normalizaciones
  if (updates.first_name !== undefined) updates.first_name = toNullIfEmpty(updates.first_name);
  if (updates.last_name !== undefined) updates.last_name = toNullIfEmpty(updates.last_name);
  if (updates.phone !== undefined) updates.phone = toNullIfEmpty(updates.phone);

  if (updates.email !== undefined) {
    const e = toNullIfEmpty(updates.email);
    updates.email = e ? String(e).trim().toLowerCase() : null;
  }

  if (updates.avatar_url !== undefined) {
    updates.avatar_url = toNullIfEmpty(updates.avatar_url);
  }

  // Email unique
  if (updates.email && updates.email !== before.email) {
    const existing = await query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [updates.email, userId]
    );
    if (existing.length) throw new AppError('AUTH_EMAIL_TAKEN', 'Email already in use', 409);
  }

  const fields = Object.keys(updates);
  if (!fields.length) return before;

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await query(`UPDATE users SET ${sets}, updated_at = NOW() WHERE id = ?`, [...values, userId]);

  const after = await getMe(userId);

  await logAudit({
    module: 'users',
    action: 'update_me',
    entity: 'users',
    entityId: userId,
    userId,
    before,
    after,
    req
  });

  return after;
}

// ---------------------------------------------
// Password
// ---------------------------------------------
async function changePassword(userId, { current_password, new_password }, req) {
  const curr = String(current_password ?? '');
  const next = String(new_password ?? '');

  // ✅ match con frontend (min 8)
  if (curr.length < 8 || next.length < 8) {
    throw new AppError('VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
  }

  const rows = await query('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows.length) throw new AppError('NOT_FOUND', 'User not found', 404);

  const ok = await bcrypt.compare(curr, rows[0].password_hash);
  if (!ok) throw new AppError('AUTH_INVALID_CREDENTIALS', 'Current password invalid', 401);

  const hash = await bcrypt.hash(next, 10);
  await query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, userId]);

  await logAudit({
    module: 'users',
    action: 'change_password',
    entity: 'users',
    entityId: userId,
    userId,
    before: { password_changed: false },
    after: { password_changed: true },
    req
  });

  return { changed: true };
}

// ---------------------------------------------
// Settings (ME)  ✅ NUEVO
// Tabla esperada: user_settings(user_id PK, theme, high_contrast, compact_mode, animations, dna_opacity, ...)
// ---------------------------------------------
async function getMySettings(userId) {
  const rows = await query(
    `
    SELECT user_id, theme, high_contrast, compact_mode, animations, dna_opacity
    FROM user_settings
    WHERE user_id = ? LIMIT 1
  `,
    [userId]
  );

  if (rows.length) {
    const s = rows[0];
    return {
      user_id: s.user_id,
      theme: s.theme || 'dark',
      high_contrast: !!(typeof s.high_contrast === 'boolean' ? s.high_contrast : Number(s.high_contrast) === 1),
      compact_mode: !!(typeof s.compact_mode === 'boolean' ? s.compact_mode : Number(s.compact_mode) === 1),
      animations: !!(typeof s.animations === 'boolean' ? s.animations : Number(s.animations) === 1),
      dna_opacity: clamp(s.dna_opacity ?? 0.2, 0.1, 0.5)
    };
  }

  // Si no existe row, lo creamos (default)
  await query(
    `
    INSERT INTO user_settings (user_id, theme, high_contrast, compact_mode, animations, dna_opacity)
    VALUES (?, 'dark', 0, 0, 1, 0.20)
  `,
    [userId]
  );

  return {
    user_id: userId,
    theme: 'dark',
    high_contrast: false,
    compact_mode: false,
    animations: true,
    dna_opacity: 0.2
  };
}

async function updateMySettings(userId, payload, req) {
  const before = await getMySettings(userId);

  const updates = {};

  if (payload.theme !== undefined) {
    const t = String(payload.theme).trim().toLowerCase();
    if (!['dark', 'light'].includes(t)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid theme', 400);
    }
    updates.theme = t;
  }

  if (payload.high_contrast !== undefined) {
    updates.high_contrast = (payload.high_contrast === true || payload.high_contrast === 'true') ? 1 : 0;
  }

  if (payload.compact_mode !== undefined) {
    updates.compact_mode = (payload.compact_mode === true || payload.compact_mode === 'true') ? 1 : 0;
  }

  if (payload.animations !== undefined) {
    updates.animations = (payload.animations === true || payload.animations === 'true') ? 1 : 0;
  }

  if (payload.dna_opacity !== undefined) {
    updates.dna_opacity = clamp(payload.dna_opacity, 0.1, 0.5);
  }

  const fields = Object.keys(updates);
  if (!fields.length) return before;

  // Garantiza que exista (por si update sin row)
  await tx(async (conn) => {
    await conn.execute(
      `
      INSERT INTO user_settings (user_id, theme, high_contrast, compact_mode, animations, dna_opacity)
      VALUES (?, 'dark', 0, 0, 1, 0.20)
      ON DUPLICATE KEY UPDATE user_id = user_id
    `,
      [userId]
    );

    const sets = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => updates[f]);

    await conn.execute(
      `UPDATE user_settings SET ${sets} WHERE user_id = ?`,
      [...values, userId]
    );
  });

  const after = await getMySettings(userId);

  await logAudit({
    module: 'user_settings',
    action: 'update_me_settings',
    entity: 'user_settings',
    entityId: userId,
    userId,
    before,
    after,
    req
  });

  return after;
}

// ---------------------------------------------
// Admin (igual que ya tenías)
// ---------------------------------------------
async function listUsers({ page = 1, limit = 20, q, role, is_active }) {
  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const offset = (p - 1) * l;

  const where = [];
  const params = [];

  if (q) {
    where.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (role) {
    where.push('role = ?');
    params.push(role);
  }
  if (is_active !== undefined) {
    where.push('is_active = ?');
    params.push((is_active === true || is_active === 'true') ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const items = await query(
    `
    SELECT id, role, email, first_name, last_name, phone, avatar_url, is_active, created_at, updated_at, last_login_at
    FROM users
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `,
    [...params, l, offset]
  );

  const total = await query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
  return { page: p, limit: l, total: total[0]?.total || 0, items };
}

async function adminCreateUser(payload, adminUserId, req) {
  const email = String(payload.email).trim().toLowerCase();
  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length) throw new AppError('AUTH_EMAIL_TAKEN', 'Email already in use', 409);

  const role = ['admin', 'enfermeria', 'medico'].includes(payload.role) ? payload.role : 'enfermeria';
  const hash = await bcrypt.hash(String(payload.password), 10);

  const userId = await tx(async (conn) => {
    const [r] = await conn.execute(
      `
      INSERT INTO users (role, email, password_hash, first_name, last_name, phone, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [role, email, hash, payload.first_name || null, payload.last_name || null, payload.phone || null, payload.avatar_url || null]
    );

    await conn.execute(
      `
      INSERT INTO user_settings (user_id, theme, high_contrast, compact_mode, animations, dna_opacity)
      VALUES (?, 'dark', 0, 0, 1, 0.20)
    `,
      [r.insertId]
    );

    return r.insertId;
  });

  await logAudit({
    module: 'users',
    action: 'admin_create',
    entity: 'users',
    entityId: userId,
    userId: adminUserId,
    before: null,
    after: { email, role, first_name: payload.first_name, last_name: payload.last_name },
    req
  });

  return getMe(userId);
}

async function adminUpdateUser(userId, payload, adminUserId, req) {
  const before = await getMe(userId);

  const updates = {};
  if (payload.role !== undefined) {
    if (!['admin', 'enfermeria', 'medico'].includes(payload.role)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid role', 400, [{ field: 'role', issue: 'enum' }]);
    }
    updates.role = payload.role;
  }
  if (payload.is_active !== undefined) updates.is_active = (payload.is_active === true || payload.is_active === 'true') ? 1 : 0;

  const fields = Object.keys(updates);
  if (!fields.length) return before;

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await query(`UPDATE users SET ${sets}, updated_at = NOW() WHERE id = ?`, [...values, userId]);

  const after = await getMe(userId);

  await logAudit({
    module: 'users',
    action: 'admin_update',
    entity: 'users',
    entityId: userId,
    userId: adminUserId,
    before,
    after,
    req
  });

  return after;
}

module.exports = {
  getMe,
  updateMe,
  changePassword,

  // ✅ settings
  getMySettings,
  updateMySettings,

  // admin
  listUsers,
  adminCreateUser,
  adminUpdateUser
};
