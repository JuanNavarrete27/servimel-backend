const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const { validate } = require('../../middlewares/validate');
const controller = require('./enfermeria.controller');

const router = express.Router();

router.get('/hoy',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  controller.today
);

router.post('/residentes/:residentId/vitals',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({
    params: { residentId: { required: true, type: 'number' } },
    body: {
      taken_at: { type: 'string' },
      temp_c: { type: 'number' },
      bp_systolic: { type: 'number' },
      bp_diastolic: { type: 'number' },
      hr: { type: 'number' },
      rr: { type: 'number' },
      spo2: { type: 'number' },
      pain: { type: 'number' },
      notes: { type: 'string', max: 2000 }
    }
  }),
  controller.createVital
);

router.post('/residentes/:residentId/medications',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({
    params: { residentId: { required: true, type: 'number' } },
    body: {
      drug_name: { required: true, type: 'string', max: 190 },
      dose: { type: 'string', max: 120 },
      route: { type: 'string', max: 120 },
      status: { type: 'string' },
      scheduled_at: { type: 'string' },
      administered_at: { type: 'string' },
      notes: { type: 'string', max: 2000 }
    }
  }),
  controller.createMedication
);

router.post('/residentes/:residentId/observations',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({
    params: { residentId: { required: true, type: 'number' } },
    body: {
      type: { type: 'string' }, // normal | alerta
      observed_at: { type: 'string' },
      text: { required: true, type: 'string', max: 5000 }
    }
  }),
  controller.createObservation
);

router.put('/observations/:id/resolve',
  authRequired,
  requireRole('admin', 'enfermeria', 'medico'),
  validate({ params: { id: { required: true, type: 'number' } } }),
  controller.resolveObservation
);

module.exports = router;
