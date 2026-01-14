// src/modules/cocina/cocina.controller.js
// ============================================================
// SERVIMEL — Cocina Controller
// ============================================================

const service = require('./cocina.service');

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

module.exports = {
  async listMenusByWeek(req, res, next) {
    try {
      const weekStart = String(req.query.weekStart);
      const rows = await service.listMenusByWeek({ weekStart });
      return res.json({ ok: true, menus: rows });
    } catch (err) {
      next(err);
    }
  },

  async getMenuById(req, res, next) {
    try {
      const id = Number(req.params.id);
      const menu = await service.getMenuById({ id });
      return res.json({ ok: true, menu });
    } catch (err) {
      next(err);
    }
  },

  async createMenu(req, res, next) {
    try {
      const userId = getUserId(req);
      const menu = await service.createMenu({ payload: req.body, userId });
      return res.status(201).json({ ok: true, menu });
    } catch (err) {
      next(err);
    }
  },

  async updateMenu(req, res, next) {
    try {
      const userId = getUserId(req);
      const id = Number(req.params.id);
      const menu = await service.updateMenu({ id, payload: req.body, userId });
      return res.json({ ok: true, menu });
    } catch (err) {
      next(err);
    }
  },

  async publishMenu(req, res, next) {
    try {
      const userId = getUserId(req);
      const id = Number(req.params.id);
      const menu = await service.publishMenu({ id, userId });
      return res.json({ ok: true, menu });
    } catch (err) {
      next(err);
    }
  },

  async listAssignments(req, res, next) {
    try {
      const weekStart = String(req.query.weekStart);
      const rows = await service.listAssignments({ weekStart });
      return res.json({ ok: true, assignments: rows });
    } catch (err) {
      next(err);
    }
  },

  async saveAssignments(req, res, next) {
    try {
      const userId = getUserId(req);
      const result = await service.saveAssignments({ payload: req.body, userId });
      return res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async getViewerData(req, res, next) {
    try {
      const residentId = Number(req.query.residentId);
      const weekStart = String(req.query.weekStart);
      const data = await service.getViewerData({ residentId, weekStart });
      return res.json({ ok: true, ...data });
    } catch (err) {
      next(err);
    }
  },
};
