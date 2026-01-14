// src/modules/medicinaGeneral/medicinaGeneral.service.js
// ============================================================
// SERVIMEL — Medicina General Service (DB real)
// ============================================================

const { query, tx } = require('../../config/db');
const { AppError } = require('../../utils/responses');
// opcional: auditoría si existe en tu proyecto
let logAudit = null;
try {
  // si lo tenés en tu proyecto:
  ({ logAudit } = require('../auditoria/auditoria.service'));
} catch {
  logAudit = null;
}

function safeJsonParse(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureHeaderRow(residentId, userId = null) {
  // crea header vacío si no existe
  const rows = await query(
    'SELECT resident_id FROM mg_headers WHERE resident_id = ? LIMIT 1',
    [residentId]
  );

  if (rows.length) return;

  await query(
    `INSERT INTO mg_headers (resident_id, risk_level, allergies_json, chronic_json, created_by, updated_by)
     VALUES (?, 'BAJO', JSON_ARRAY(), JSON_ARRAY(), ?, ?)`,
    [residentId, userId, userId]
  );
}

function mapHeaderRow(r) {
  if (!r) {
    return {
      bloodGroup: '',
      rh: '+',
      weightKg: null,
      heightCm: null,
      bmi: null,
      allergies: [],
      chronicConditions: [],
      activeDiagnosesSummary: '',
      riskLevel: 'BAJO',
      treatingDoctor: '',
      lastMedicalEval: null,
      generalNotes: ''
    };
  }

  const allergies = safeJsonParse(r.allergies_json, []);
  const chronic = safeJsonParse(r.chronic_json, []);

  return {
    bloodGroup: r.blood_group || '',
    rh: r.rh || '+',
    weightKg: r.weight_kg !== null ? Number(r.weight_kg) : null,
    heightCm: r.height_cm !== null ? Number(r.height_cm) : null,
    bmi: r.bmi !== null ? Number(r.bmi) : null,
    allergies: Array.isArray(allergies) ? allergies : [],
    chronicConditions: Array.isArray(chronic) ? chronic : [],
    activeDiagnosesSummary: r.active_diagnoses_summary || '',
    riskLevel: r.risk_level || 'BAJO',
    treatingDoctor: r.treating_doctor || '',
    lastMedicalEval: r.last_medical_eval ? String(r.last_medical_eval) : null,
    generalNotes: r.general_notes || ''
  };
}

function mapListRowDate(v) {
  return v ? String(v) : null;
}

function auditSafe(payload) {
  if (!logAudit) return;
  try { logAudit(payload); } catch { /* no-op */ }
}

// ============================================================
// RECORD COMPLETO
// ============================================================

async function getRecord(residentId) {
  await ensureHeaderRow(residentId);

  const [headerRow] = await query(
    'SELECT * FROM mg_headers WHERE resident_id = ? LIMIT 1',
    [residentId]
  );

  const diagnoses = await query(
    `SELECT id, resident_id, cie10, name, diag_date, status, notes, created_at, updated_at
     FROM mg_diagnoses
     WHERE resident_id = ? AND is_active = 1
     ORDER BY diag_date DESC, id DESC`,
    [residentId]
  );

  const meds = await query(
    `SELECT id, resident_id, name, dose, schedule, route, start_date, end_date, instructions, status, prescribed_by, created_at, updated_at
     FROM mg_medications
     WHERE resident_id = ? AND is_active = 1
     ORDER BY id DESC`,
    [residentId]
  );

  const controls = await query(
    `SELECT id, resident_id, control_date, type, reason, findings, conclusion, next_control, created_at, updated_at
     FROM mg_controls
     WHERE resident_id = ? AND is_active = 1
     ORDER BY control_date DESC, id DESC`,
    [residentId]
  );

  const exams = await query(
    `SELECT id, resident_id, exam_date, type, result, notes, file_name, created_at, updated_at
     FROM mg_exams
     WHERE resident_id = ? AND is_active = 1
     ORDER BY exam_date DESC, id DESC`,
    [residentId]
  );

  const evolution = await query(
    `SELECT id, resident_id, evo_date, type, professional, note, created_at, updated_at
     FROM mg_evolution
     WHERE resident_id = ? AND is_active = 1
     ORDER BY evo_date DESC, id DESC`,
    [residentId]
  );

  const documents = await query(
    `SELECT id, resident_id, doc_date, type, file_name, notes, created_at, updated_at
     FROM mg_documents
     WHERE resident_id = ? AND is_active = 1
     ORDER BY doc_date DESC, id DESC`,
    [residentId]
  );

  const alerts = await query(
    `SELECT id, resident_id, alert_date, kind, detail, level, resolved, created_at, updated_at
     FROM mg_alerts
     WHERE resident_id = ? AND is_active = 1
     ORDER BY alert_date DESC, id DESC`,
    [residentId]
  );

  return {
    residentId,
    header: mapHeaderRow(headerRow),
    diagnoses: diagnoses.map(d => ({
      id: d.id,
      cie10: d.cie10 || '',
      name: d.name,
      date: mapListRowDate(d.diag_date),
      status: d.status,
      notes: d.notes || ''
    })),
    meds: meds.map(m => ({
      id: m.id,
      name: m.name,
      dose: m.dose || '',
      schedule: m.schedule || '',
      route: m.route || '',
      startDate: mapListRowDate(m.start_date),
      endDate: mapListRowDate(m.end_date),
      instructions: m.instructions || '',
      status: m.status,
      prescribedBy: m.prescribed_by || ''
    })),
    controls: controls.map(c => ({
      id: c.id,
      date: mapListRowDate(c.control_date),
      type: c.type,
      reason: c.reason || '',
      findings: c.findings || '',
      conclusion: c.conclusion || '',
      nextControl: mapListRowDate(c.next_control)
    })),
    exams: exams.map(e => ({
      id: e.id,
      date: mapListRowDate(e.exam_date),
      type: e.type,
      result: e.result || '',
      notes: e.notes || '',
      fileName: e.file_name || ''
    })),
    evolution: evolution.map(n => ({
      id: n.id,
      date: mapListRowDate(n.evo_date),
      type: n.type,
      professional: n.professional || '',
      note: n.note
    })),
    documents: documents.map(d => ({
      id: d.id,
      date: mapListRowDate(d.doc_date),
      type: d.type,
      fileName: d.file_name,
      notes: d.notes || ''
    })),
    alerts: alerts.map(a => ({
      id: a.id,
      date: mapListRowDate(a.alert_date),
      kind: a.kind,
      detail: a.detail || '',
      level: a.level,
      resolved: !!a.resolved
    })),
    updatedAt: headerRow?.updated_at ? new Date(headerRow.updated_at).toISOString() : new Date().toISOString()
  };
}

// ============================================================
// HEADER
// ============================================================

async function upsertHeader(residentId, header, userId = null) {
  await ensureHeaderRow(residentId, userId);

  const allergiesJson = JSON.stringify(header.allergies || []);
  const chronicJson = JSON.stringify(header.chronicConditions || []);

  await query(
    `UPDATE mg_headers
     SET blood_group = ?,
         rh = ?,
         weight_kg = ?,
         height_cm = ?,
         bmi = ?,
         allergies_json = CAST(? AS JSON),
         chronic_json = CAST(? AS JSON),
         active_diagnoses_summary = ?,
         risk_level = ?,
         treating_doctor = ?,
         last_medical_eval = ?,
         general_notes = ?,
         updated_by = ?
     WHERE resident_id = ?`,
    [
      header.bloodGroup || null,
      header.rh || '+',
      header.weightKg !== null && header.weightKg !== undefined ? header.weightKg : null,
      header.heightCm !== null && header.heightCm !== undefined ? header.heightCm : null,
      header.bmi !== null && header.bmi !== undefined ? header.bmi : null,
      allergiesJson,
      chronicJson,
      header.activeDiagnosesSummary || null,
      header.riskLevel || 'BAJO',
      header.treatingDoctor || null,
      header.lastMedicalEval || null,
      header.generalNotes || null,
      userId,
      residentId
    ]
  );

  auditSafe({
    userId,
    action: 'MG_HEADER_UPSERT',
    entity: 'mg_headers',
    entityId: residentId,
    meta: { residentId }
  });

  return getRecord(residentId);
}

// ============================================================
// CRUD GENERICOS (por entidad)
// ============================================================

async function createDiagnosis(residentId, d, userId = null) {
  if (!d.name) throw new AppError('Diagnóstico requerido', 400, 'VALIDATION_ERROR');

  const date = d.date || todayISO();

  const res = await query(
    `INSERT INTO mg_diagnoses (resident_id, cie10, name, diag_date, status, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [residentId, d.cie10 || null, d.name, date, d.status || 'ACTIVO', d.notes || null, userId, userId]
  );

  auditSafe({ userId, action: 'MG_DIAG_CREATE', entity: 'mg_diagnoses', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateDiagnosis(residentId, id, d, userId = null) {
  const r = await query(
    `UPDATE mg_diagnoses
     SET cie10 = ?, name = ?, diag_date = ?, status = ?, notes = ?, updated_by = ?
     WHERE id = ? AND resident_id = ? AND is_active = 1`,
    [d.cie10 || null, d.name, d.date || todayISO(), d.status || 'ACTIVO', d.notes || null, userId, id, residentId]
  );

  if (!r.affectedRows) throw new AppError('Diagnóstico no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_DIAG_UPDATE', entity: 'mg_diagnoses', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteDiagnosis(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_diagnoses SET is_active = 0, updated_by = ?
     WHERE id = ? AND resident_id = ? AND is_active = 1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Diagnóstico no encontrado', 404, 'NOT_FOUND');

  auditSafe({ userId, action: 'MG_DIAG_DELETE', entity: 'mg_diagnoses', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

// ---- MEDS
async function createMedication(residentId, m, userId = null) {
  if (!m.name) throw new AppError('Medicamento requerido', 400, 'VALIDATION_ERROR');

  const res = await query(
    `INSERT INTO mg_medications (resident_id, name, dose, schedule, route, start_date, end_date, instructions, status, prescribed_by, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      residentId,
      m.name,
      m.dose || null,
      m.schedule || null,
      m.route || null,
      m.startDate || null,
      m.endDate || null,
      m.instructions || null,
      m.status || 'ACTIVO',
      m.prescribedBy || null,
      userId,
      userId
    ]
  );

  auditSafe({ userId, action: 'MG_MED_CREATE', entity: 'mg_medications', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateMedication(residentId, id, m, userId = null) {
  const r = await query(
    `UPDATE mg_medications
     SET name=?, dose=?, schedule=?, route=?, start_date=?, end_date=?, instructions=?, status=?, prescribed_by=?, updated_by=?
     WHERE id=? AND resident_id=? AND is_active=1`,
    [
      m.name,
      m.dose || null,
      m.schedule || null,
      m.route || null,
      m.startDate || null,
      m.endDate || null,
      m.instructions || null,
      m.status || 'ACTIVO',
      m.prescribedBy || null,
      userId,
      id,
      residentId
    ]
  );

  if (!r.affectedRows) throw new AppError('Medicación no encontrada', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_MED_UPDATE', entity: 'mg_medications', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteMedication(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_medications SET is_active=0, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Medicación no encontrada', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_MED_DELETE', entity: 'mg_medications', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

// ---- CONTROLS
async function createControl(residentId, c, userId = null) {
  if (!c.date) throw new AppError('Fecha requerida', 400, 'VALIDATION_ERROR');

  const res = await query(
    `INSERT INTO mg_controls (resident_id, control_date, type, reason, findings, conclusion, next_control, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      residentId,
      c.date,
      c.type || 'RUTINA',
      c.reason || null,
      c.findings || null,
      c.conclusion || null,
      c.nextControl || null,
      userId,
      userId
    ]
  );

  auditSafe({ userId, action: 'MG_CTRL_CREATE', entity: 'mg_controls', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateControl(residentId, id, c, userId = null) {
  const r = await query(
    `UPDATE mg_controls
     SET control_date=?, type=?, reason=?, findings=?, conclusion=?, next_control=?, updated_by=?
     WHERE id=? AND resident_id=? AND is_active=1`,
    [
      c.date || todayISO(),
      c.type || 'RUTINA',
      c.reason || null,
      c.findings || null,
      c.conclusion || null,
      c.nextControl || null,
      userId,
      id,
      residentId
    ]
  );

  if (!r.affectedRows) throw new AppError('Control no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_CTRL_UPDATE', entity: 'mg_controls', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteControl(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_controls SET is_active=0, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Control no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_CTRL_DELETE', entity: 'mg_controls', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

// ---- EXAMS
async function createExam(residentId, e, userId = null) {
  if (!e.date || !e.type) throw new AppError('Fecha y tipo requeridos', 400, 'VALIDATION_ERROR');

  const res = await query(
    `INSERT INTO mg_exams (resident_id, exam_date, type, result, notes, file_name, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [residentId, e.date, e.type, e.result || null, e.notes || null, e.fileName || null, userId, userId]
  );

  auditSafe({ userId, action: 'MG_EXAM_CREATE', entity: 'mg_exams', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateExam(residentId, id, e, userId = null) {
  const r = await query(
    `UPDATE mg_exams
     SET exam_date=?, type=?, result=?, notes=?, file_name=?, updated_by=?
     WHERE id=? AND resident_id=? AND is_active=1`,
    [e.date || todayISO(), e.type, e.result || null, e.notes || null, e.fileName || null, userId, id, residentId]
  );

  if (!r.affectedRows) throw new AppError('Examen no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_EXAM_UPDATE', entity: 'mg_exams', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteExam(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_exams SET is_active=0, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Examen no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_EXAM_DELETE', entity: 'mg_exams', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

// ---- EVOLUTION
async function createEvolution(residentId, n, userId = null) {
  if (!n.date || !n.note) throw new AppError('Fecha y nota requeridas', 400, 'VALIDATION_ERROR');

  const res = await query(
    `INSERT INTO mg_evolution (resident_id, evo_date, type, professional, note, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [residentId, n.date, n.type || 'RUTINA', n.professional || null, n.note, userId, userId]
  );

  auditSafe({ userId, action: 'MG_EVO_CREATE', entity: 'mg_evolution', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateEvolution(residentId, id, n, userId = null) {
  const r = await query(
    `UPDATE mg_evolution
     SET evo_date=?, type=?, professional=?, note=?, updated_by=?
     WHERE id=? AND resident_id=? AND is_active=1`,
    [n.date || todayISO(), n.type || 'RUTINA', n.professional || null, n.note, userId, id, residentId]
  );

  if (!r.affectedRows) throw new AppError('Evolución no encontrada', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_EVO_UPDATE', entity: 'mg_evolution', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteEvolution(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_evolution SET is_active=0, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Evolución no encontrada', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_EVO_DELETE', entity: 'mg_evolution', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

// ---- DOCUMENTS
async function createDocument(residentId, d, userId = null) {
  if (!d.date || !d.type || !d.fileName) throw new AppError('Fecha, tipo y archivo requeridos', 400, 'VALIDATION_ERROR');

  const res = await query(
    `INSERT INTO mg_documents (resident_id, doc_date, type, file_name, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [residentId, d.date, d.type, d.fileName, d.notes || null, userId, userId]
  );

  auditSafe({ userId, action: 'MG_DOC_CREATE', entity: 'mg_documents', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateDocument(residentId, id, d, userId = null) {
  const r = await query(
    `UPDATE mg_documents
     SET doc_date=?, type=?, file_name=?, notes=?, updated_by=?
     WHERE id=? AND resident_id=? AND is_active=1`,
    [d.date || todayISO(), d.type, d.fileName, d.notes || null, userId, id, residentId]
  );

  if (!r.affectedRows) throw new AppError('Documento no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_DOC_UPDATE', entity: 'mg_documents', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteDocument(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_documents SET is_active=0, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Documento no encontrado', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_DOC_DELETE', entity: 'mg_documents', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

// ---- ALERTS
async function createAlert(residentId, a, userId = null) {
  if (!a.date || !a.kind) throw new AppError('Fecha y tipo requeridos', 400, 'VALIDATION_ERROR');

  const res = await query(
    `INSERT INTO mg_alerts (resident_id, alert_date, kind, detail, level, resolved, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [residentId, a.date, a.kind, a.detail || null, a.level || 'WARN', a.resolved ? 1 : 0, userId, userId]
  );

  auditSafe({ userId, action: 'MG_ALERT_CREATE', entity: 'mg_alerts', entityId: res.insertId, meta: { residentId } });
  return getRecord(residentId);
}

async function updateAlert(residentId, id, a, userId = null) {
  const r = await query(
    `UPDATE mg_alerts
     SET alert_date=?, kind=?, detail=?, level=?, resolved=?, updated_by=?
     WHERE id=? AND resident_id=? AND is_active=1`,
    [a.date || todayISO(), a.kind, a.detail || null, a.level || 'WARN', a.resolved ? 1 : 0, userId, id, residentId]
  );

  if (!r.affectedRows) throw new AppError('Alerta no encontrada', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_ALERT_UPDATE', entity: 'mg_alerts', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function deleteAlert(residentId, id, userId = null) {
  const r = await query(
    `UPDATE mg_alerts SET is_active=0, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [userId, id, residentId]
  );
  if (!r.affectedRows) throw new AppError('Alerta no encontrada', 404, 'NOT_FOUND');
  auditSafe({ userId, action: 'MG_ALERT_DELETE', entity: 'mg_alerts', entityId: id, meta: { residentId } });
  return getRecord(residentId);
}

async function toggleAlert(residentId, id, userId = null) {
  const rows = await query(
    `SELECT resolved FROM mg_alerts WHERE id=? AND resident_id=? AND is_active=1 LIMIT 1`,
    [id, residentId]
  );
  if (!rows.length) throw new AppError('Alerta no encontrada', 404, 'NOT_FOUND');

  const nextVal = rows[0].resolved ? 0 : 1;

  await query(
    `UPDATE mg_alerts SET resolved=?, updated_by=? WHERE id=? AND resident_id=? AND is_active=1`,
    [nextVal, userId, id, residentId]
  );

  auditSafe({ userId, action: 'MG_ALERT_TOGGLE', entity: 'mg_alerts', entityId: id, meta: { residentId, resolved: !!nextVal } });
  return getRecord(residentId);
}

module.exports = {
  getRecord,
  upsertHeader,

  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,

  createMedication,
  updateMedication,
  deleteMedication,

  createControl,
  updateControl,
  deleteControl,

  createExam,
  updateExam,
  deleteExam,

  createEvolution,
  updateEvolution,
  deleteEvolution,

  createDocument,
  updateDocument,
  deleteDocument,

  createAlert,
  updateAlert,
  deleteAlert,
  toggleAlert
};
