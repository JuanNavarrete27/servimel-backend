// src/modules/medicinaGeneral/medicinaGeneral.controller.js
// ============================================================
// SERVIMEL — Medicina General Controller
// ============================================================

const service = require('./medicinaGeneral.service');
const {
  sanitizeHeader,
  sanitizeDiagnosis,
  sanitizeMedication,
  sanitizeControl,
  sanitizeExam,
  sanitizeEvolution,
  sanitizeDocument,
  sanitizeAlert
} = require('./medicinaGeneral.validators');

function userIdFromReq(req) {
  return req.user?.id || req.user?.userId || null;
}

module.exports = {
  // GET /medicina-general/:residentId
  async getRecord(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const data = await service.getRecord(residentId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // PUT /medicina-general/:residentId/header
  async upsertHeader(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const header = sanitizeHeader(req.body || {});
      const data = await service.upsertHeader(residentId, header, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // DIAGNOSES
  async createDiagnosis(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeDiagnosis(req.body || {});
      const data = await service.createDiagnosis(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateDiagnosis(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeDiagnosis(req.body || {});
      const data = await service.updateDiagnosis(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteDiagnosis(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteDiagnosis(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // MEDS
  async createMedication(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeMedication(req.body || {});
      const data = await service.createMedication(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateMedication(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeMedication(req.body || {});
      const data = await service.updateMedication(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteMedication(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteMedication(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // CONTROLS
  async createControl(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeControl(req.body || {});
      const data = await service.createControl(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateControl(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeControl(req.body || {});
      const data = await service.updateControl(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteControl(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteControl(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // EXAMS
  async createExam(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeExam(req.body || {});
      const data = await service.createExam(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateExam(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeExam(req.body || {});
      const data = await service.updateExam(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteExam(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteExam(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // EVOLUTION
  async createEvolution(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeEvolution(req.body || {});
      const data = await service.createEvolution(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateEvolution(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeEvolution(req.body || {});
      const data = await service.updateEvolution(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteEvolution(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteEvolution(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // DOCUMENTS
  async createDocument(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeDocument(req.body || {});
      const data = await service.createDocument(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateDocument(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeDocument(req.body || {});
      const data = await service.updateDocument(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteDocument(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteDocument(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // ALERTS
  async createAlert(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const userId = userIdFromReq(req);
      const payload = sanitizeAlert(req.body || {});
      const data = await service.createAlert(residentId, payload, userId);
      res.status(201).json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateAlert(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const payload = sanitizeAlert(req.body || {});
      const data = await service.updateAlert(residentId, id, payload, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deleteAlert(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.deleteAlert(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },

  // PATCH /medicina-general/:residentId/alerts/:id/toggle
  async toggleAlert(req, res, next) {
    try {
      const residentId = Number(req.params.residentId);
      const id = Number(req.params.id);
      const userId = userIdFromReq(req);
      const data = await service.toggleAlert(residentId, id, userId);
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  }
};
