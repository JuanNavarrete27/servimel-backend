const { query } = require('../../config/db');
const { AppError } = require('../../utils/responses');
const { logAudit } = require('../auditoria/auditoria.service');

async function ensureMySettings(userId) {
  const rows = await query(`
    SELECT user_id
    FROM user_settings
    WHERE user_id = ? LIMIT 1
  `, [userId]);

  if (rows.length) return;

  // ✅ defaults seguros
  await query(`
    INSERT INTO user_settings
      (user_id, theme, high_contrast, compact_mode, animations, dna_opacity, created_at, updated_at)
    VALUES
      (?, 'dark', 0, 0, 1, 0.22, NOW(), NOW())
  `, [userId]);
}

async function getMySettings(userId) {
  await ensureMySettings(userId);

  const rows = await query(`
    SELECT
      user_id, theme, high_contrast, compact_mode, animations, dna_opacity,
      created_at, updated_at
    FROM user_settings
    WHERE user_id = ? LIMIT 1
  `, [userId]);

  if (!rows.length) throw new AppError('NOT_FOUND', 'Settings not found', 404);

  // normalize booleans for JSON
  const s = rows[0];
  return {
    ...s,
    high_contrast: Boolean(s.high_contrast),
    compact_mode: Boolean(s.compact_mode),
    animations: Boolean(s.animations),
    dna_opacity: Number(s.dna_opacity)
  };
}

async function updateMySettings(userId, payload, req) {
  const before = await getMySettings(userId);

  const updates = {};

  if (payload.theme !== undefined) {
    let t = payload.theme;

    // ✅ tolerante con frontend (servimel-dark / high-contrast)
    if (t === 'servimel-dark') t = 'dark';

    if (t === 'high-contrast') {
      // backend theme sigue siendo dark, pero activamos high_contrast
      t = 'dark';
      if (payload.high_contrast === undefined) {
        updates.high_contrast = 1;
      }
    }

    if (!['dark', 'light', 'dim'].includes(t)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid theme', 400, [{ field: 'theme', issue: 'enum' }]);
    }
    updates.theme = t;
  }

  if (payload.high_contrast !== undefined) updates.high_contrast = (payload.high_contrast === true || payload.high_contrast === 'true') ? 1 : 0;
  if (payload.compact_mode !== undefined) updates.compact_mode = (payload.compact_mode === true || payload.compact_mode === 'true') ? 1 : 0;
  if (payload.animations !== undefined) updates.animations = (payload.animations === true || payload.animations === 'true') ? 1 : 0;
  if (payload.dna_opacity !== undefined) {
    const v = Number(payload.dna_opacity);
    if (Number.isNaN(v) || v < 0.10 || v > 0.50) {
      throw new AppError('VALIDATION_ERROR', 'dna_opacity out of range', 400, [{ field: 'dna_opacity', issue: 'range_0.10_0.50' }]);
    }
    updates.dna_opacity = v;
  }

  const fields = Object.keys(updates);
  if (!fields.length) return before;

  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await query(`UPDATE user_settings SET ${sets}, updated_at = NOW() WHERE user_id = ?`, [...values, userId]);

  const after = await getMySettings(userId);

  await logAudit({
    module: 'settings',
    action: 'update_me',
    entity: 'user_settings',
    entityId: userId,
    userId,
    before,
    after,
    req
  });

  return after;
}

module.exports = { getMySettings, updateMySettings };
