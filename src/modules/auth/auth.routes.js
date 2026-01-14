// src/modules/auth/auth.routes.js
const express = require('express');
const { validate } = require('../../middlewares/validate');
const { authRequired } = require('../../middlewares/auth');
const controller = require('./auth.controller');

const router = express.Router();

router.post(
  '/register',
  validate({
    body: {
      email: { required: true, type: 'string', max: 190 },
      password: { required: true, type: 'string', min: 8, max: 120 }, // ✅ min 8
      first_name: { type: 'string', max: 120 },
      last_name: { type: 'string', max: 120 },
      phone: { type: 'string', max: 40 },
      avatar_url: { type: 'string', max: 500 },
      // ✅ FIX: permitir roles conocidos sin romper bootstrap
      role: { type: 'string', max: 40 } // used only for bootstrap first user
    }
  }),
  controller.register
);

router.post(
  '/login',
  validate({
    body: {
      email: { required: true, type: 'string', max: 190 },
      password: { required: true, type: 'string', min: 8, max: 120 } // ✅ min 8
    }
  }),
  controller.login
);

router.post('/logout', authRequired, controller.logout);

// ✅ /auth/me (requiere token)
router.get('/me', authRequired, controller.me);

module.exports = router;
