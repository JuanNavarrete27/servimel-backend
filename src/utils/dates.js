function startOfTodayUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
}

function addDaysUtc(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoUtc(date) {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { startOfTodayUtc, addDaysUtc, toIsoUtc };
