// src/modules/medicinaGeneral/medicinaGeneral.routes.js
// ============================================================
// SERVIMEL — Medicina General Routes
// ✅ READ: admin/enfermeria/medico
// ✅ WRITE: admin/medico
// ============================================================

const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');

const controller = require('./medicinaGeneral.controller');
const { ensureParamInt, ensureBodyRequired } = require('./medicinaGeneral.validators');

const router = express.Router();

// ============================================================
// GET /medicina-general/:residentId  (record completo)
// ============================================================
router.get(
  '/:residentId',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  ensureParamInt('residentId'),
  controller.getRecord
);

// ============================================================
// PUT /medicina-general/:residentId/header
// ============================================================
router.put(
  '/:residentId/header',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  controller.upsertHeader
);

// ============================================================
// DIAGNOSES
// ============================================================
router.post(
  '/:residentId/diagnoses',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['name']),
  controller.createDiagnosis
);

router.put(
  '/:residentId/diagnoses/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['name']),
  controller.updateDiagnosis
);

router.delete(
  '/:residentId/diagnoses/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteDiagnosis
);

// ============================================================
// MEDS
// ============================================================
router.post(
  '/:residentId/meds',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['name']),
  controller.createMedication
);

router.put(
  '/:residentId/meds/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['name']),
  controller.updateMedication
);

router.delete(
  '/:residentId/meds/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteMedication
);

// ============================================================
// CONTROLS
// ============================================================
router.post(
  '/:residentId/controls',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['date']),
  controller.createControl
);

router.put(
  '/:residentId/controls/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['date']),
  controller.updateControl
);

router.delete(
  '/:residentId/controls/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteControl
);

// ============================================================
// EXAMS
// ============================================================
router.post(
  '/:residentId/exams',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['date', 'type']),
  controller.createExam
);

router.put(
  '/:residentId/exams/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['date', 'type']),
  controller.updateExam
);

router.delete(
  '/:residentId/exams/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteExam
);

// ============================================================
// EVOLUTION
// ============================================================
router.post(
  '/:residentId/evolution',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['date', 'note']),
  controller.createEvolution
);

router.put(
  '/:residentId/evolution/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['date', 'note']),
  controller.updateEvolution
);

router.delete(
  '/:residentId/evolution/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteEvolution
);

// ============================================================
// DOCUMENTS
// ============================================================
router.post(
  '/:residentId/documents',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['date', 'type', 'fileName']),
  controller.createDocument
);

router.put(
  '/:residentId/documents/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['date', 'type', 'fileName']),
  controller.updateDocument
);

router.delete(
  '/:residentId/documents/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteDocument
);

// ============================================================
// ALERTS
// ============================================================
router.post(
  '/:residentId/alerts',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureBodyRequired(['date', 'kind']),
  controller.createAlert
);

router.put(
  '/:residentId/alerts/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  ensureBodyRequired(['date', 'kind']),
  controller.updateAlert
);

router.delete(
  '/:residentId/alerts/:id',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.deleteAlert
);

router.patch(
  '/:residentId/alerts/:id/toggle',
  authRequired,
  requireRole('admin', 'medico'),
  ensureParamInt('residentId'),
  ensureParamInt('id'),
  controller.toggleAlert
);

module.exports = router;
