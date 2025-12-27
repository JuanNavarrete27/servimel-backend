const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const { validate } = require('../../middlewares/validate');
const controller = require('./users.controller');

const router = express.Router();

// -----------------------------------
// ME
// -----------------------------------
router.get('/me', authRequired, controller.me);

router.put(
  '/me',
  authRequired,
  validate({
    body: {
      first_name: { type: 'string', max: 120 },
      last_name: { type: 'string', max: 120 },
      phone: { type: 'string', max: 40 },
      email: { type: 'string', max: 190 },
      avatar_url: { type: 'string', max: 500 }
    }
  }),
  controller.updateMe
);

// ✅ Password (min 8 como tu UI)
router.put(
  '/me/password',
  authRequired,
  validate({
    body: {
      current_password: { required: true, type: 'string', min: 8, max: 120 },
      new_password: { required: true, type: 'string', min: 8, max: 120 }
    }
  }),
  controller.changePassword
);

// -----------------------------------
// ✅ SETTINGS (ME)
// -----------------------------------
router.get('/me/settings', authRequired, controller.mySettings);

router.put(
  '/me/settings',
  authRequired,
  validate({
    body: {
      theme: { type: 'string', max: 20 },          // dark | light (validación fuerte en service)
      high_contrast: { type: 'boolean' },
      compact_mode: { type: 'boolean' },
      animations: { type: 'boolean' },
      dna_opacity: { type: 'number' }             // clamp 0.1 - 0.5 en service
    }
  }),
  controller.updateMySettings
);

// -----------------------------------
// Admin ops
// -----------------------------------
router.get(
  '/',
  authRequired,
  requireRole('admin'),
  validate({
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      q: { type: 'string', max: 190 },
      role: { type: 'string' },
      is_active: { type: 'boolean' }
    }
  }),
  controller.list
);

router.post(
  '/',
  authRequired,
  requireRole('admin'),
  validate({
    body: {
      email: { required: true, type: 'string', max: 190 },
      password: { required: true, type: 'string', min: 8, max: 120 }, // ✅ min 8
      role: { required: true, type: 'string' },
      first_name: { type: 'string', max: 120 },
      last_name: { type: 'string', max: 120 },
      phone: { type: 'string', max: 40 },
      avatar_url: { type: 'string', max: 500 }
    }
  }),
  controller.adminCreate
);

router.put(
  '/:id',
  authRequired,
  requireRole('admin'),
  validate({
    params: { id: { required: true, type: 'number' } },
    body: {
      role: { type: 'string' },
      is_active: { type: 'boolean' }
    }
  }),
  controller.adminUpdate
);

module.exports = router;
