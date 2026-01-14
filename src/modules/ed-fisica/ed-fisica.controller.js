// src/modules/ed-fisica/ed-fisica.controller.js
// ============================================================
// SERVIMEL — Educación Física Controller
// ✅ Contrato estable (plan + logs)
// ✅ weekStart se normaliza (si viene vacío, se calcula desde dateIso o hoy)
// ✅ logs devuelve "items" (compat) + "rows" (tu formato actual)
// ============================================================

const service = require('./ed-fisica.service');

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekISO(dateIso) {
  // Semana LUNES. dateIso: YYYY-MM-DD
  const [y, m, d] = String(dateIso).split('-').map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const day = dt.getDay(); // 0 dom..6 sab
  const diffToMon = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMon);
  return toISODate(dt);
}

function normalizeWeekStart(req) {
  const weekStartRaw = String(req.query.weekStart || '').trim();
  if (weekStartRaw) return weekStartRaw;

  const fromDateIso = String(req.query.dateIso || req.query.date || '').trim();
  if (fromDateIso) return startOfWeekISO(fromDateIso);

  return startOfWeekISO(toISODate(new Date()));
}

module.exports = {
  async getPlanByResidentWeek(req, res, next) {
    try {
      const residentId = Number(req.query.residentId);
      const weekStart = normalizeWeekStart(req);

      const plan = await service.getPlanByResidentWeek({ residentId, weekStart });
      return res.json({ ok: true, plan });
    } catch (err) {
      next(err);
    }
  },

  async createPlan(req, res, next) {
    try {
      const userId = getUserId(req);
      const payload = req.body;

      const plan = await service.createPlan({ payload, userId });
      return res.status(201).json({ ok: true, plan });
    } catch (err) {
      next(err);
    }
  },

  async updatePlan(req, res, next) {
    try {
      const userId = getUserId(req);
      const id = Number(req.params.id);
      const payload = req.body;

      const plan = await service.updatePlan({ id, payload, userId });
      return res.json({ ok: true, plan });
    } catch (err) {
      next(err);
    }
  },

  async publishPlan(req, res, next) {
    try {
      const userId = getUserId(req);
      const id = Number(req.params.id);

      const plan = await service.publishPlan({ id, userId });
      return res.json({ ok: true, plan });
    } catch (err) {
      next(err);
    }
  },

  async listLogs(req, res, next) {
    try {
      const residentId = Number(req.query.residentId);
      const weekStart = normalizeWeekStart(req);

      const rows = await service.listLogs({ residentId, weekStart });

      // compat: algunos front esperan items/data
      return res.json({
        ok: true,
        rows,
        items: rows,
        weekStart,
      });
    } catch (err) {
      next(err);
    }
  },

  async createLog(req, res, next) {
    try {
      const userId = getUserId(req);
      const row = await service.createLog({ payload: req.body, userId });

      // compat: algunos front esperan item
      return res.status(201).json({ ok: true, row, item: row });
    } catch (err) {
      next(err);
    }
  },
};
