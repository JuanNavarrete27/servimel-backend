const express = require('express');
const { validate } = require('../../middlewares/validate');
const controller = require('./servicios.controller');

const router = express.Router();

router.get('/', controller.listCategories);

router.get('/:slug', controller.getCategory);

router.get(
  '/:slug/items',
  validate({
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      q: { type: 'string', max: 190 }
    }
  }),
  controller.listItems
);

router.post(
  '/:slug/items',
  validate({
    body: {
      title: { required: true, type: 'string', max: 190 },
      description: { type: 'string', max: 2000 },
      content: { type: 'string' },
      is_active: { type: 'boolean' }
    }
  }),
  controller.createItem
);

router.put(
  '/:slug/items/:id',
  validate({
    params: { id: { required: true, type: 'number' } },
    body: {
      title: { type: 'string', max: 190 },
      description: { type: 'string', max: 2000 },
      content: { type: 'string' },
      is_active: { type: 'boolean' }
    }
  }),
  controller.updateItem
);

router.delete(
  '/:slug/items/:id',
  validate({ params: { id: { required: true, type: 'number' } } }),
  controller.deleteItem
);

module.exports = router;
