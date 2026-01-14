// src/modules/ed-fisica/ed-fisica.routes.js
// ============================================================
// SERVIMEL — Educación Física Routes (DB real)
// Roles:
//  - VIEW: admin, medico, enfermeria, edfisica, profesor
//  - EDIT: admin, edfisica, profesor
//
// ✅ Importante: este router se monta en app.js como:
//    safeMount('/api/ed-fisica', edFisicaRoutes)
//    => Las rutas reales quedan: /api/ed-fisica/plans, /api/ed-fisica/logs, etc.
// ============================================================

const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const controller = require('./ed-fisica.controller');
const v = require('./ed-fisica.validators');

const router = express.Router();

// -------------------- PLANS --------------------
// GET /api/ed-fisica/plans?residentId=1&weekStart=YYYY-MM-DD
router.get(
  '/plans',
  authRequired,
  requireRole('admin', 'medico', 'enfermeria', 'edfisica', 'profesor'),
  v.validatePlanQuery,
  controller.getPlanByResidentWeek
);

// POST /api/ed-fisica/plans  (crear plan semanal si no existe)
router.post(
  '/plans',
  authRequired,
  requireRole('admin', 'edfisica', 'profesor'),
  v.validateCreatePlan,
  controller.createPlan
);

// PUT /api/ed-fisica/plans/:id (actualizar plan)
router.put(
  '/plans/:id',
  authRequired,
  requireRole('admin', 'edfisica', 'profesor'),
  v.validatePlanId,
  v.validateUpsertPlan,
  controller.updatePlan
);

// POST /api/ed-fisica/plans/:id/publish
router.post(
  '/plans/:id/publish',
  authRequired,
  requireRole('admin', 'edfisica', 'profesor'),
  v.validatePlanId,
  controller.publishPlan
);

// -------------------- LOGS --------------------
// GET /api/ed-fisica/logs?residentId=1&weekStart=YYYY-MM-DD
router.get(
  '/logs',
  authRequired,
  requireRole('admin', 'medico', 'enfermeria', 'edfisica', 'profesor'),
  v.validateLogsQuery,
  controller.listLogs
);

// POST /api/ed-fisica/logs
router.post(
  '/logs',
  authRequired,
  requireRole('admin', 'edfisica', 'profesor'),
  v.validateCreateLog,
  controller.createLog
);

// (Opcional futuro) DELETE /api/ed-fisica/logs/:id  => volver a "pendiente"
// router.delete(
//   '/logs/:id',
//   authRequired,
//   requireRole('admin', 'edfisica', 'profesor'),
//   v.validateLogId,
//   controller.deleteLog
// );

module.exports = router;
