// src/modules/fisioterapia/fisioterapia.controller.js
// ============================================================
// SERVIMEL — Fisioterapia Controller (READ-ONLY)
// ============================================================

const service = require('./fisioterapia.service');

function toInt(v, def) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
}

exports.getResidentPhysio = async (req, res, next) => {
  try {
    const residentId = Number(req.params.residentId);

    const limit = toInt(req.query.limit, 50);
    const offset = toInt(req.query.offset, 0);

    const data = await service.getResidentPhysio(residentId, { limit, offset });

    return res.json({
      ok: true,
      data
    });
  } catch (err) {
    return next(err);
  }
};
