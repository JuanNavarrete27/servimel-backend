// src/modules/yoga/yoga.controller.js
// ============================================================
// SERVIMEL — Yoga Controller
// ============================================================

const service = require('./yoga.service');
const { AppError } = require('../../utils/responses');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function ok(res, data) {
  return res.status(200).json({ ok: true, data });
}

function created(res, data) {
  return res.status(201).json({ ok: true, data });
}

// =========================
// SEQUENCES
// =========================
exports.listSequences = asyncHandler(async (req, res) => {
  const limit = req.query.limit;
  const data = await service.listSequences({ limit });
  return ok(res, { items: data });
});

exports.createSequence = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?.userId ?? null;

  const name = String(req.body.name).trim();
  const tone = String(req.body.tone).trim().toLowerCase();
  const minutes = Number(req.body.minutes);
  const items = req.body.items;
  const note = req.body.note ?? null;

  const id = await service.createSequence({ name, tone, minutes, items, note }, userId);
  return created(res, { id });
});

exports.updateSequence = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?.userId ?? null;

  const id = Number(req.params.id);
  const name = String(req.body.name).trim();
  const tone = String(req.body.tone).trim().toLowerCase();
  const minutes = Number(req.body.minutes);
  const items = req.body.items;
  const note = req.body.note ?? null;

  await service.updateSequence(id, { name, tone, minutes, items, note }, userId);
  return ok(res, { updated: true });
});

exports.deleteSequence = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?.userId ?? null;
  const id = Number(req.params.id);

  await service.softDeleteSequence(id, userId);
  return ok(res, { deleted: true });
});

// =========================
// WEEK PLANS
// =========================
exports.getWeekPlan = asyncHandler(async (req, res) => {
  const residentId = Number(req.params.residentId);
  const weekStart = String(req.query.weekStart);

  const plan = await service.getWeekPlan(residentId, weekStart);
  return ok(res, { plan });
});

exports.upsertWeekPlan = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?.userId ?? null;

  const residentId = Number(req.params.residentId);
  const weekStart = String(req.query.weekStart);

  const planObj = req.body.plan ?? req.body;
  if (!planObj || typeof planObj !== 'object') throw new AppError('Body inválido', 400);

  await service.upsertWeekPlan(residentId, weekStart, planObj, userId);
  return ok(res, { saved: true });
});
