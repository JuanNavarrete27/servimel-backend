// src/modules/dashboard/dashboard.service.js
// ============================================================
// SERVIMEL — Dashboard service (DB real)
// ✅ Devuelve shapes compatibles con el FRONTEND:
//    - DashboardKpis: { residentes_activos:number, registros_hoy:number, alertas_pendientes:number }
//    - DashboardQuick: { ultimas_alertas: DashboardQuickItem[] }
// ============================================================

const { query } = require('../../config/db');
const { startOfTodayUtc, toIsoUtc } = require('../../utils/dates');

async function getKpis() {
  const start = startOfTodayUtc();
  const startSql = toIsoUtc(start);

  const residentesActivos = await query(
    'SELECT COUNT(*) AS c FROM residents WHERE is_active = 1',
    []
  );

  // registros hoy (total) = vitals + meds + observations
  const vitalsHoy = await query(
    'SELECT COUNT(*) AS c FROM vitals WHERE taken_at >= ?',
    [startSql]
  );

  const medsHoy = await query(
    `
    SELECT COUNT(*) AS c
    FROM medications
    WHERE scheduled_at >= ?
       OR (administered_at IS NOT NULL AND administered_at >= ?)
  `,
    [startSql, startSql]
  );

  const obsHoy = await query(
    'SELECT COUNT(*) AS c FROM observations WHERE observed_at >= ?',
    [startSql]
  );

  const registrosHoyTotal =
    (vitalsHoy[0]?.c || 0) + (medsHoy[0]?.c || 0) + (obsHoy[0]?.c || 0);

  // alertas pendientes:
  // - observaciones tipo alerta sin resolver
  // - medicación pending/late (pendientes reales)
  const alertasObsPend = await query(
    "SELECT COUNT(*) AS c FROM observations WHERE type = 'alerta' AND resolved_at IS NULL",
    []
  );

  const alertasMedsPend = await query(
    "SELECT COUNT(*) AS c FROM medications WHERE status IN ('pending','late')",
    []
  );

  return {
    residentes_activos: residentesActivos[0]?.c || 0,
    registros_hoy: registrosHoyTotal,
    alertas_pendientes: (alertasObsPend[0]?.c || 0) + (alertasMedsPend[0]?.c || 0)
  };
}

async function getQuick() {
  // Quick list: últimos eventos con warning/critical
  // Se arma un titulo útil para el frontend (no tiene campo "residenteNombre")
  const rows = await query(
    `
    SELECT
      t.id,
      t.resident_id,
      t.title,
      t.summary,
      t.severity,
      t.occurred_at,
      r.first_name,
      r.last_name
    FROM timeline_events t
    JOIN residents r ON r.id = t.resident_id
    WHERE r.is_active = 1
      AND t.severity IN ('warning','critical')
    ORDER BY t.occurred_at DESC
    LIMIT 10
  `,
    []
  );

  const ultimas_alertas = (rows || []).map((x) => {
    const fullName = [x.first_name, x.last_name].filter(Boolean).join(' ').trim();
    const baseTitle = x.title || 'Alerta';
    const titulo = fullName
      ? `${fullName} — ${baseTitle}${x.summary ? `: ${x.summary}` : ''}`
      : `${baseTitle}${x.summary ? `: ${x.summary}` : ''}`;

    return {
      id: Number(x.id),
      fecha: x.occurred_at ? new Date(x.occurred_at).toISOString() : new Date().toISOString(),
      titulo,
      severity: (x.severity || undefined),
      residenteId: Number(x.resident_id)
    };
  });

  return { ultimas_alertas };
}

module.exports = { getKpis, getQuick };
