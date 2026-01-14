// src/modules/medicinaGeneral/medicinaGeneral.validators.js
// ============================================================
// SERVIMEL — Medicina General Validators (sin express-validator)
// ============================================================

const { AppError } = require('../../utils/responses');

function toInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function pickStr(v, max = 255) {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function pickDate(v) {
  // Espera YYYY-MM-DD o null/empty
  if (!v) return null;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function pickEnum(v, allowed, fallback) {
  const s = String(v || '').trim().toUpperCase();
  return allowed.includes(s) ? s : fallback;
}

function pickBool(v, fallback = false) {
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return fallback;
}

function ensureParamInt(paramName) {
  return (req, _res, next) => {
    const n = toInt(req.params[paramName]);
    if (!n) return next(new AppError(`Parámetro inválido: ${paramName}`, 400, 'VALIDATION_ERROR'));
    req.params[paramName] = String(n);
    next();
  };
}

function ensureBodyRequired(fields = []) {
  return (req, _res, next) => {
    for (const f of fields) {
      if (req.body?.[f] === undefined || req.body?.[f] === null || String(req.body[f]).trim() === '') {
        return next(new AppError(`Campo requerido: ${f}`, 400, 'VALIDATION_ERROR'));
      }
    }
    next();
  };
}

// ============ Sanitizers de payloads ============

function sanitizeHeader(body = {}) {
  const allergies = Array.isArray(body.allergies) ? body.allergies.map(x => pickStr(x, 60)).filter(Boolean) : [];
  const chronic = Array.isArray(body.chronicConditions) ? body.chronicConditions.map(x => pickStr(x, 80)).filter(Boolean) : [];

  return {
    bloodGroup: pickStr(body.bloodGroup, 8),
    rh: pickStr(body.rh, 2) || '+',
    weightKg: body.weightKg !== undefined && body.weightKg !== null && body.weightKg !== '' ? Number(body.weightKg) : null,
    heightCm: body.heightCm !== undefined && body.heightCm !== null && body.heightCm !== '' ? Number(body.heightCm) : null,
    bmi: body.bmi !== undefined && body.bmi !== null && body.bmi !== '' ? Number(body.bmi) : null,
    allergies,
    chronicConditions: chronic,
    activeDiagnosesSummary: pickStr(body.activeDiagnosesSummary, 255),
    riskLevel: pickEnum(body.riskLevel, ['ALTO', 'MEDIO', 'BAJO'], 'BAJO'),
    treatingDoctor: pickStr(body.treatingDoctor, 120),
    lastMedicalEval: pickDate(body.lastMedicalEval),
    generalNotes: body.generalNotes ? String(body.generalNotes).trim() : ''
  };
}

function sanitizeDiagnosis(body = {}) {
  return {
    cie10: pickStr(body.cie10, 16),
    name: pickStr(body.name, 180),
    date: pickDate(body.date),
    status: pickEnum(body.status, ['ACTIVO', 'CONTROLADO', 'RESUELTO'], 'ACTIVO'),
    notes: body.notes ? String(body.notes).trim() : ''
  };
}

function sanitizeMedication(body = {}) {
  return {
    name: pickStr(body.name, 160),
    dose: pickStr(body.dose, 60),
    schedule: pickStr(body.schedule, 80),
    route: pickStr(body.route, 16),
    startDate: pickDate(body.startDate),
    endDate: pickDate(body.endDate),
    instructions: body.instructions ? String(body.instructions).trim() : '',
    status: pickEnum(body.status, ['ACTIVO', 'SUSPENDIDO', 'FINALIZADO'], 'ACTIVO'),
    prescribedBy: pickStr(body.prescribedBy, 120)
  };
}

function sanitizeControl(body = {}) {
  return {
    date: pickDate(body.date),
    type: pickEnum(body.type, ['RUTINA', 'URGENCIA', 'SEGUIMIENTO'], 'RUTINA'),
    reason: pickStr(body.reason, 255),
    findings: body.findings ? String(body.findings).trim() : '',
    conclusion: body.conclusion ? String(body.conclusion).trim() : '',
    nextControl: pickDate(body.nextControl)
  };
}

function sanitizeExam(body = {}) {
  return {
    date: pickDate(body.date),
    type: pickStr(body.type, 120),
    result: pickStr(body.result, 255),
    notes: body.notes ? String(body.notes).trim() : '',
    fileName: pickStr(body.fileName, 220)
  };
}

function sanitizeEvolution(body = {}) {
  return {
    date: pickDate(body.date),
    type: pickEnum(body.type, ['RUTINA', 'SEGUIMIENTO', 'URGENCIA'], 'RUTINA'),
    professional: pickStr(body.professional, 120),
    note: body.note ? String(body.note).trim() : ''
  };
}

function sanitizeDocument(body = {}) {
  return {
    date: pickDate(body.date),
    type: pickStr(body.type, 120),
    fileName: pickStr(body.fileName, 220),
    notes: body.notes ? String(body.notes).trim() : ''
  };
}

function sanitizeAlert(body = {}) {
  return {
    date: pickDate(body.date),
    kind: pickStr(body.kind, 140),
    detail: pickStr(body.detail, 255),
    level: pickEnum(body.level, ['INFO', 'WARN', 'CRIT'], 'WARN'),
    resolved: pickBool(body.resolved, false)
  };
}

module.exports = {
  ensureParamInt,
  ensureBodyRequired,

  sanitizeHeader,
  sanitizeDiagnosis,
  sanitizeMedication,
  sanitizeControl,
  sanitizeExam,
  sanitizeEvolution,
  sanitizeDocument,
  sanitizeAlert
};
