// src/modules/servicios/servicios.routes.js
// ============================================================
// SERVIMEL — Servicios Routes
// ✅ DB real (service_categories / service_items)
// ✅ Lectura: roles amplios (admin/enfermeria/medico/cocinero/fisio/entrenador_fisico/staff)
// ✅ Escritura: SOLO admin
// ✅ includeInactive: permitido solo admin (controller lo fuerza)
// ============================================================

const express = require('express');
const { authRequired } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/role');
const { validate } = require('../../middlewares/validate');
const controller = require('./servicios.controller');

const router = express.Router();

// Roles que pueden VER servicios (cocina/yoga/ed-fisica/medicina-general)
const READ_ROLES = [
  'admin',
  'enfermeria',
  'medico',
  'cocinero',
  'fisio',
  'entrenador_fisico',
  'staff'
];

// ------------------------------------------------------------
// LISTAR CATEGORÍAS (activas)
// GET /servicios
// ------------------------------------------------------------
router.get(
  '/',
  authRequired,
  requireRole(...READ_ROLES),
  controller.listCategories
);

// ------------------------------------------------------------
// LISTAR ÍTEMS DE UNA CATEGORÍA (paginado / búsqueda)
// GET /servicios/:slug/items?page&limit&q&includeInactive
// ------------------------------------------------------------
router.get(
  '/:slug/items',
  authRequired,
  requireRole(...READ_ROLES),
  validate({
    params: { slug: { required: true, type: 'string', max: 80 } },
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      q: { type: 'string', max: 190 },
      includeInactive: { type: 'boolean' } // solo admin (controller lo aplica)
    }
  }),
  controller.listItems
);

// ------------------------------------------------------------
// GET /servicios/:slug  -> category + items (con meta)
// (ideal para páginas: medicina-general/yoga/ed-fisica/cocina)
// ------------------------------------------------------------
router.get(
  '/:slug',
  authRequired,
  requireRole(...READ_ROLES),
  validate({
    params: { slug: { required: true, type: 'string', max: 80 } },
    query: {
      page: { type: 'number' },
      limit: { type: 'number' },
      q: { type: 'string', max: 190 },
      includeInactive: { type: 'boolean' } // solo admin (controller lo aplica)
    }
  }),
  controller.getCategory
);

// ------------------------------------------------------------
// ADMIN CRUD ÍTEMS
// ------------------------------------------------------------
router.post(
  '/:slug/items',
  authRequired,
  requireRole('admin'),
  validate({
    params: { slug: { required: true, type: 'string', max: 80 } },
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
  authRequired,
  requireRole('admin'),
  validate({
    params: {
      slug: { required: true, type: 'string', max: 80 },
      id: { required: true, type: 'number' }
    },
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
  authRequired,
  requireRole('admin'),
  validate({
    params: {
      slug: { required: true, type: 'string', max: 80 },
      id: { required: true, type: 'number' }
    }
  }),
  controller.deleteItem
);

module.exports = router;
