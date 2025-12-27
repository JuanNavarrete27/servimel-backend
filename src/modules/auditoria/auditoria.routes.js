const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const { validate } = require('../../middlewares/validate');
const controller = require('./auditoria.controller');

const router = express.Router();

// Admin only (auditoría completa)
router.get('/',
  authRequired,
  requireRole('admin'),
  validate({
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      module: { type: 'string' },
      action: { type: 'string' },
      entity: { type: 'string' },
      userId: { type: 'number' }
    }
  }),
  controller.list
);

module.exports = router;
