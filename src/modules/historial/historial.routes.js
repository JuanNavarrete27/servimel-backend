const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const { validate } = require('../../middlewares/validate');
const controller = require('./historial.controller');

const router = express.Router();

router.get('/residentes/:residentId',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({
    params: { residentId: { required: true, type: 'number' } },
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      preset: { type: 'string' }, // hoy|7d|all
      fechaDesde: { type: 'string' },
      fechaHasta: { type: 'string' },
      type: { type: 'string' } // vital|medication|observation|...
    }
  }),
  controller.listByResident
);

router.get('/eventos/:eventId',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({ params: { eventId: { required: true, type: 'number' } } }),
  controller.getEvent
);

module.exports = router;
