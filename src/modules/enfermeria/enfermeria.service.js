const { tx, query } = require('../../config/db');
const { AppError } = require('../../utils/responses');
const { startOfTodayUtc, toIsoUtc } = require('../../utils/dates');
const { logAudit } = require('../auditoria/auditoria.service');

async function ensureResident(conn, residentId) {
  const [rows] = await conn.execute('SELECT id FROM residents WHERE id = ? AND is_active = 1 LIMIT 1', [residentId]);
  if (!rows.length) throw new AppError('NOT_FOUND', 'Resident not found', 404);
}

async function createVital(residentId, userId, payload, req) {
  return tx(async (conn) => {
    await ensureResident(conn, residentId);

    const takenAt = payload.taken_at ? new Date(payload.taken_at) : new Date();
    const takenAtSql = toIsoUtc(takenAt);

    const [r] = await conn.execute(`
      INSERT INTO vitals
        (resident_id, user_id, taken_at, temp_c, bp_systolic, bp_diastolic, hr, rr, spo2, pain, notes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      residentId,
      userId,
      takenAtSql,
      payload.temp_c ?? null,
      payload.bp_systolic ?? null,
      payload.bp_diastolic ?? null,
      payload.hr ?? null,
      payload.rr ?? null,
      payload.spo2 ?? null,
      payload.pain ?? null,
      payload.notes || null
    ]);

    const vitalId = r.insertId;

    const [vitalRows] = await conn.execute(`
      SELECT
        v.id, v.resident_id, v.user_id, v.taken_at,
        v.temp_c, v.bp_systolic, v.bp_diastolic, v.hr, v.rr, v.spo2, v.pain, v.notes,
        v.created_at
      FROM vitals v
      WHERE v.id = ? LIMIT 1
    `, [vitalId]);

    // Timeline event
    const title = 'Signos vitales registrados';
    const summaryParts = [];
    if (payload.temp_c !== undefined && payload.temp_c !== null) summaryParts.push(`Temp ${payload.temp_c}°C`);
    if (payload.hr !== undefined && payload.hr !== null) summaryParts.push(`FC ${payload.hr}`);
    if (payload.spo2 !== undefined && payload.spo2 !== null) summaryParts.push(`SpO2 ${payload.spo2}%`);
    if (payload.bp_systolic !== undefined && payload.bp_diastolic !== undefined && payload.bp_systolic !== null && payload.bp_diastolic !== null) {
      summaryParts.push(`PA ${payload.bp_systolic}/${payload.bp_diastolic}`);
    }
    const summary = summaryParts.join(' · ') || null;

    const [te] = await conn.execute(`
      INSERT INTO timeline_events
        (resident_id, user_id, event_type, ref_table, ref_id, severity, title, summary, occurred_at)
      VALUES
        (?, ?, 'vital', 'vitals', ?, 'info', ?, ?, ?)
    `, [residentId, userId, vitalId, title, summary, takenAtSql]);

    // Audit
    await logAudit({
      module: 'enfermeria',
      action: 'create_vital',
      entity: 'vitals',
      entityId: vitalId,
      userId,
      before: null,
      after: { ...vitalRows[0], timeline_event_id: te.insertId },
      req
    });

    return { ...vitalRows[0], timeline_event_id: te.insertId };
  });
}

async function createMedication(residentId, userId, payload, req) {
  return tx(async (conn) => {
    await ensureResident(conn, residentId);

    const scheduledAt = payload.scheduled_at ? new Date(payload.scheduled_at) : new Date();
    const administeredAt = payload.administered_at ? new Date(payload.administered_at) : null;

    const status = ['administered', 'pending', 'late', 'suspended'].includes(payload.status)
      ? payload.status
      : (administeredAt ? 'administered' : 'pending');

    const [r] = await conn.execute(`
      INSERT INTO medications
        (resident_id, user_id, drug_name, dose, route, status,
         scheduled_at, administered_at, notes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      residentId,
      userId,
      payload.drug_name,
      payload.dose || null,
      payload.route || null,
      status,
      toIsoUtc(scheduledAt),
      administeredAt ? toIsoUtc(administeredAt) : null,
      payload.notes || null
    ]);

    const medId = r.insertId;

    const [medRows] = await conn.execute(`
      SELECT
        m.id, m.resident_id, m.user_id, m.drug_name, m.dose, m.route, m.status,
        m.scheduled_at, m.administered_at, m.notes, m.created_at
      FROM medications m
      WHERE m.id = ? LIMIT 1
    `, [medId]);

    const title = 'Medicación';
    const summary = `${payload.drug_name}${payload.dose ? ` · ${payload.dose}` : ''}${payload.route ? ` · ${payload.route}` : ''} · ${status}`;

    const [te] = await conn.execute(`
      INSERT INTO timeline_events
        (resident_id, user_id, event_type, ref_table, ref_id, severity, title, summary, occurred_at)
      VALUES
        (?, ?, 'medication', 'medications', ?, ?, ?, ?, ?)
    `, [
      residentId,
      userId,
      medId,
      (status === 'late') ? 'warning' : (status === 'suspended' ? 'warning' : 'info'),
      title,
      summary,
      toIsoUtc(administeredAt || scheduledAt)
    ]);

    await logAudit({
      module: 'enfermeria',
      action: 'create_medication',
      entity: 'medications',
      entityId: medId,
      userId,
      before: null,
      after: { ...medRows[0], timeline_event_id: te.insertId },
      req
    });

    return { ...medRows[0], timeline_event_id: te.insertId };
  });
}

async function createObservation(residentId, userId, payload, req) {
  return tx(async (conn) => {
    await ensureResident(conn, residentId);

    const observedAt = payload.observed_at ? new Date(payload.observed_at) : new Date();
    const type = ['normal', 'alerta'].includes(payload.type) ? payload.type : 'normal';

    const [r] = await conn.execute(`
      INSERT INTO observations
        (resident_id, user_id, type, observed_at, text, resolved_at, resolved_by_user_id)
      VALUES
        (?, ?, ?, ?, ?, NULL, NULL)
    `, [
      residentId,
      userId,
      type,
      toIsoUtc(observedAt),
      payload.text
    ]);

    const obsId = r.insertId;

    const [obsRows] = await conn.execute(`
      SELECT
        o.id, o.resident_id, o.user_id, o.type, o.observed_at, o.text,
        o.resolved_at, o.resolved_by_user_id, o.created_at
      FROM observations o
      WHERE o.id = ? LIMIT 1
    `, [obsId]);

    const title = type === 'alerta' ? 'Observación (ALERTA)' : 'Observación';
    const summary = (payload.text || '').slice(0, 180) || null;

    const [te] = await conn.execute(`
      INSERT INTO timeline_events
        (resident_id, user_id, event_type, ref_table, ref_id, severity, title, summary, occurred_at)
      VALUES
        (?, ?, 'observation', 'observations', ?, ?, ?, ?, ?)
    `, [
      residentId,
      userId,
      obsId,
      type === 'alerta' ? 'critical' : 'info',
      title,
      summary,
      toIsoUtc(observedAt)
    ]);

    await logAudit({
      module: 'enfermeria',
      action: 'create_observation',
      entity: 'observations',
      entityId: obsId,
      userId,
      before: null,
      after: { ...obsRows[0], timeline_event_id: te.insertId },
      req
    });

    return { ...obsRows[0], timeline_event_id: te.insertId };
  });
}

async function resolveObservation(obsId, userId, req) {
  const before = await query(`
    SELECT id, resident_id, type, resolved_at, resolved_by_user_id
    FROM observations WHERE id = ? LIMIT 1
  `, [obsId]);

  if (!before.length) throw new AppError('NOT_FOUND', 'Observation not found', 404);
  if (before[0].resolved_at) return { resolved: true, id: obsId };

  await query(`
    UPDATE observations
    SET resolved_at = NOW(), resolved_by_user_id = ?, updated_at = NOW()
    WHERE id = ?
  `, [userId, obsId]);

  await logAudit({
    module: 'enfermeria',
    action: 'resolve_observation',
    entity: 'observations',
    entityId: obsId,
    userId,
    before: before[0],
    after: { ...before[0], resolved_at: 'NOW()', resolved_by_user_id: userId },
    req
  });

  return { resolved: true, id: obsId };
}

async function todaySummary() {
  const start = startOfTodayUtc();
  const startSql = toIsoUtc(start);

  const vitals = await query('SELECT COUNT(*) AS c FROM vitals WHERE taken_at >= ?', [startSql]);
  const meds = await query('SELECT COUNT(*) AS c FROM medications WHERE scheduled_at >= ? OR (administered_at IS NOT NULL AND administered_at >= ?)', [startSql, startSql]);
  const obs = await query('SELECT COUNT(*) AS c FROM observations WHERE observed_at >= ?', [startSql]);

  return {
    date_utc: start.toISOString().slice(0, 10),
    counts: {
      vitals: vitals[0]?.c || 0,
      medications: meds[0]?.c || 0,
      observations: obs[0]?.c || 0
    }
  };
}

module.exports = {
  createVital,
  createMedication,
  createObservation,
  resolveObservation,
  todaySummary
};
