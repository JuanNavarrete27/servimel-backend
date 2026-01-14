// src/modules/yoga/yoga.routes.js
// ============================================================
// SERVIMEL — Yoga Routes
// ============================================================

const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');

const controller = require('./yoga.controller');
const {
  validateResidentParam,
  validateSequenceIdParam,
  validateWeekStartQuery,
  validateSequenceBody,
  validatePlanBody,
} = require('./yoga.validators');

const router = express.Router();

// Roles
const VIEW_ROLES = ['admin', 'medico', 'enfermeria', 'yoga', 'profesor', 'coordinacion'];
const EDIT_ROLES = ['admin', 'medico', 'yoga', 'profesor', 'coordinacion'];

// =========================
// SEQUENCES
// =========================
router.get(
  '/sequences',
  authRequired,
  requireRole(...VIEW_ROLES),
  controller.listSequences
);

router.post(
  '/sequences',
  authRequired,
  requireRole(...EDIT_ROLES),
  validateSequenceBody,
  controller.createSequence
);

router.put(
  '/sequences/:id',
  authRequired,
  requireRole(...EDIT_ROLES),
  validateSequenceIdParam,
  validateSequenceBody,
  controller.updateSequence
);

router.delete(
  '/sequences/:id',
  authRequired,
  requireRole(...EDIT_ROLES),
  validateSequenceIdParam,
  controller.deleteSequence
);

// =========================
// WEEK PLANS
// GET/PUT /yoga/plans/:residentId?weekStart=YYYY-MM-DD (lunes)
// =========================
router.get(
  '/plans/:residentId',
  authRequired,
  requireRole(...VIEW_ROLES),
  validateResidentParam,
  validateWeekStartQuery,
  controller.getWeekPlan
);

router.put(
  '/plans/:residentId',
  authRequired,
  requireRole(...EDIT_ROLES),
  validateResidentParam,
  validateWeekStartQuery,
  validatePlanBody,
  controller.upsertWeekPlan
);

module.exports = router;
