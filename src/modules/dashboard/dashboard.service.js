const { query } = require('../../config/db');
const { startOfTodayUtc, toIsoUtc } = require('../../utils/dates');

async function getKpis() {
  const start = startOfTodayUtc();
  const startSql = toIsoUtc(start);

  const residentesActivos = await query('SELECT COUNT(*) AS c FROM residents WHERE is_active = 1', []);
  const vitalsHoy = await query('SELECT COUNT(*) AS c FROM vitals WHERE taken_at >= ?', [startSql]);
  const medsHoy = await query('SELECT COUNT(*) AS c FROM medications WHERE scheduled_at >= ? OR (administered_at IS NOT NULL AND administered_at >= ?)', [startSql, startSql]);
  const obsHoy = await query('SELECT COUNT(*) AS c FROM observations WHERE observed_at >= ?', [startSql]);

  const alertasObsPend = await query("SELECT COUNT(*) AS c FROM observations WHERE type = 'alerta' AND resolved_at IS NULL", []);
  const alertasMedsPend = await query("SELECT COUNT(*) AS c FROM medications WHERE status IN ('pending','late')", []);

  return {
    residentes_activos: residentesActivos[0]?.c || 0,
    registros_hoy: {
      vitals: vitalsHoy[0]?.c || 0,
      medications: medsHoy[0]?.c || 0,
      observations: obsHoy[0]?.c || 0
    },
    alertas_pendientes: (alertasObsPend[0]?.c || 0) + (alertasMedsPend[0]?.c || 0)
  };
}

async function getQuick() {
  const latestAlerts = await query(`
    SELECT
      t.id, t.resident_id, r.first_name, r.last_name,
      t.title, t.summary, t.severity, t.occurred_at
    FROM timeline_events t
    JOIN residents r ON r.id = t.resident_id
    WHERE t.severity IN ('warning','critical') AND r.is_active = 1
    ORDER BY t.occurred_at DESC
    LIMIT 10
  `);

  return { latest_alerts: latestAlerts };
}

module.exports = { getKpis, getQuick };
