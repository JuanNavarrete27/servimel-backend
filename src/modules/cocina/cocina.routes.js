// src/modules/cocina/cocina.routes.js
// ============================================================
// SERVIMEL — Cocina Routes
// Roles:
//  - VIEW: admin, medico, enfermeria, cocinero
//  - EDIT: admin, cocinero
// ============================================================

const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const controller = require('./cocina.controller');
const v = require('./cocina.validators');

const router = express.Router();

// -------------------- MENUS --------------------
// GET /cocina/menus?weekStart=YYYY-MM-DD
router.get(
  '/menus',
  authRequired,
  requireRole('admin', 'medico', 'enfermeria', 'cocinero'),
  v.validateWeekStartQuery,
  controller.listMenusByWeek
);

// GET /cocina/menus/:id
router.get(
  '/menus/:id',
  authRequired,
  requireRole('admin', 'medico', 'enfermeria', 'cocinero'),
  v.validateIdParam,
  controller.getMenuById
);

// POST /cocina/menus
router.post(
  '/menus',
  authRequired,
  requireRole('admin', 'cocinero'),
  v.validateCreateMenu,
  controller.createMenu
);

// PUT /cocina/menus/:id
router.put(
  '/menus/:id',
  authRequired,
  requireRole('admin', 'cocinero'),
  v.validateIdParam,
  v.validateUpdateMenu,
  controller.updateMenu
);

// POST /cocina/menus/:id/publish
router.post(
  '/menus/:id/publish',
  authRequired,
  requireRole('admin', 'cocinero'),
  v.validateIdParam,
  controller.publishMenu
);

// -------------------- ASSIGNMENTS --------------------
// GET /cocina/assignments?weekStart=YYYY-MM-DD
router.get(
  '/assignments',
  authRequired,
  requireRole('admin', 'medico', 'enfermeria', 'cocinero'),
  v.validateWeekStartQuery,
  controller.listAssignments
);

// PUT /cocina/assignments (upsert masivo)
router.put(
  '/assignments',
  authRequired,
  requireRole('admin', 'cocinero'),
  v.validateSaveAssignments,
  controller.saveAssignments
);

// -------------------- VIEWER --------------------
// GET /cocina/view?residentId=1&weekStart=YYYY-MM-DD
router.get(
  '/view',
  authRequired,
  requireRole('admin', 'medico', 'enfermeria', 'cocinero'),
  v.validateViewerQuery,
  controller.getViewerData
);

module.exports = router;
