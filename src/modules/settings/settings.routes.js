const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const controller = require('./settings.controller');

const router = express.Router();

router.get('/me', authRequired, controller.me);

router.put('/me',
  authRequired,
  validate({
    body: {
      theme: { type: 'string' },
      high_contrast: { type: 'boolean' },
      compact_mode: { type: 'boolean' },
      animations: { type: 'boolean' },
      dna_opacity: { type: 'number' }
    }
  }),
  controller.updateMe
);

module.exports = router;
