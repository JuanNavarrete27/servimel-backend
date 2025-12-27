const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const { validate } = require('../../middlewares/validate');
const controller = require('./residentes.controller');

const router = express.Router();

// Roles allowed: admin, enfermeria, medico
router.get('/',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      q: { type: 'string', max: 190 },
      status: { type: 'string' },
      is_active: { type: 'boolean' }
    }
  }),
  controller.list
);

router.get('/:id',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({ params: { id: { required: true, type: 'number' } } }),
  controller.getById
);

router.post('/',
  authRequired,
  requireRole('admin', 'enfermeria'),
  validate({
    body: {
      first_name: { required: true, type: 'string', max: 120 },
      last_name: { required: true, type: 'string', max: 120 },
      document_number: { type: 'string', max: 40 },
      room: { type: 'string', max: 40 },
      status: { type: 'string' },
      emergency_contact_name: { type: 'string', max: 120 },
      emergency_contact_phone: { type: 'string', max: 40 },
      notes: { type: 'string', max: 2000 }
    }
  }),
  controller.create
);

router.put('/:id',
  authRequired,
  requireRole('admin', 'enfermeria'),
  validate({
    params: { id: { required: true, type: 'number' } },
    body: {
      first_name: { type: 'string', max: 120 },
      last_name: { type: 'string', max: 120 },
      document_number: { type: 'string', max: 40 },
      room: { type: 'string', max: 40 },
      status: { type: 'string' },
      emergency_contact_name: { type: 'string', max: 120 },
      emergency_contact_phone: { type: 'string', max: 40 },
      notes: { type: 'string', max: 2000 }
    }
  }),
  controller.update
);

router.delete('/:id',
  authRequired,
  requireRole('admin'),
  validate({ params: { id: { required: true, type: 'number' } } }),
  controller.deactivate
);

module.exports = router;
