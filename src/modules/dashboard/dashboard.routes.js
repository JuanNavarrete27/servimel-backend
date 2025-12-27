const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const controller = require('./dashboard.controller');

const router = express.Router();

router.get('/kpis', authRequired, requireRole('admin', 'enfermeria', 'medico'), controller.kpis);
router.get('/quick', authRequired, requireRole('admin', 'enfermeria', 'medico'), controller.quick);

module.exports = router;
