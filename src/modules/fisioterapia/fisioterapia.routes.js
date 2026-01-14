// src/modules/fisioterapia/fisioterapia.routes.js
// ============================================================
// SERVIMEL — Fisioterapia Routes (DB real, READ-ONLY por ahora)
// ✅ GET ficha fisioterapia por residente (para modal informativo)
// 🔒 authRequired + requireRole()
// ============================================================

const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');

const controller = require('./fisioterapia.controller');
const { validateResidentId, validatePaging } = require('./fisioterapia.validators');

const router = express.Router();

// ============================================================
// GET /fisioterapia/residentes/:residentId
// Devuelve ficha de fisioterapia (status/plan/sessions/notes)
// Query opcional: ?limit=50&offset=0  (aplica a sessions y notes)
// ============================================================
router.get(
  '/residentes/:residentId',
  authRequired,
  // ✅ FIX: soportar ambos esquemas de rol (req.user.role / req.user.rol)
  requireRole('admin', 'enfermeria', 'medico', 'fisioterapeuta', 'fisioterapia'),
  validateResidentId,
  validatePaging,
  controller.getResidentPhysio
);

module.exports = router;
