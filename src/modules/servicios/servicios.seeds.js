// src/modules/servicios/servicios.seed.js
// ============================================================
// SERVIMEL — Seed idempotente de "Servicios"
// ✅ Crea/actualiza categorías base (slug fijo) con UPSERT
// ✅ (Opcional) crea/actualiza items iniciales por categoría
// ✅ NO corre solo: lo llamás desde app.js si querés (flag por ENV)
// Requiere tablas: service_categories, service_items (ver servicios.sql)
// ============================================================

const { tx } = require('../../config/db');

const BASE_CATEGORIES = [
  {
    slug: 'medicina-general',
    name: 'Medicina General',
    description: 'Indicaciones médicas, controles, consultas y seguimiento.',
    is_active: 1
  },
  {
    slug: 'yoga',
    name: 'Yoga',
    description: 'Sesiones, rutinas, respiración y bienestar.',
    is_active: 1
  },
  {
    slug: 'fisioterapia',
    name: 'Fisioterapia',
    description: 'Rehabilitación, movilidad y ejercicios terapéuticos.',
    is_active: 1
  },
  {
    slug: 'cocina',
    name: 'Cocina',
    description: 'Planificación de menús, dietas y registros de cocina.',
    is_active: 1
  },
  {
    slug: 'ed-fisica',
    name: 'Educación Física',
    description: 'Activación física, rutinas, y planificación de actividades.',
    is_active: 1
  }
];

// Items iniciales (opcionales). Se upsertean por (category_id, title)
// Requiere UNIQUE(category_id,title) en service_items.
const BASE_ITEMS = {
  'medicina-general': [
    {
      title: 'Control semanal',
      description: 'Registro de controles generales y evolución.',
      content: 'Checklist: presión, frecuencia cardíaca, síntomas, medicación vigente.',
      is_active: 1
    }
  ],
  yoga: [
    {
      title: 'Rutina suave (15 min)',
      description: 'Secuencia corta de movilidad + respiración.',
      content: 'Respiración 4-4-6, movilidad cervical, gato-vaca, torsiones suaves.',
      is_active: 1
    }
  ],
  fisioterapia: [
    {
      title: 'Movilidad básica',
      description: 'Protocolo inicial de movilidad.',
      content: 'Ejercicios guiados: tobillo/rodilla/cadera con rango tolerable.',
      is_active: 1
    }
  ],
  cocina: [
    {
      title: 'Menú del día',
      description: 'Estructura base para cargar menú diario.',
      content: 'Desayuno / Almuerzo / Merienda / Cena + notas.',
      is_active: 1
    }
  ],
  'ed-fisica': [
    {
      title: 'Activación (10 min)',
      description: 'Activación general de baja intensidad.',
      content: 'Marcha suave, movilidad articular, respiración y estiramientos dinámicos.',
      is_active: 1
    }
  ]
};

function toTinyInt(v) {
  return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true' ? 1 : 0;
}

/**
 * Seed idempotente.
 * @param {{ withItems?: boolean }} opts
 */
async function seedServicios(opts = {}) {
  const withItems = !!opts.withItems;

  return tx(async (conn) => {
    // 1) UPSERT categorías
    for (const c of BASE_CATEGORIES) {
      await conn.execute(
        `
        INSERT INTO service_categories (slug, name, description, is_active)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP
        `,
        [c.slug, c.name, c.description ?? null, toTinyInt(c.is_active)]
      );
    }

    // 2) Leer IDs
    const [catRows] = await conn.execute(
      `
      SELECT id, slug
      FROM service_categories
      WHERE slug IN (${BASE_CATEGORIES.map(() => '?').join(',')})
      `,
      BASE_CATEGORIES.map((c) => c.slug)
    );

    const slugToId = new Map(catRows.map((r) => [r.slug, Number(r.id)]));

    // 3) (Opcional) UPSERT items iniciales
    let itemsCount = 0;

    if (withItems) {
      for (const slug of Object.keys(BASE_ITEMS)) {
        const categoryId = slugToId.get(slug);
        if (!categoryId) continue;

        for (const it of BASE_ITEMS[slug]) {
          itemsCount += 1;

          await conn.execute(
            `
            INSERT INTO service_items (category_id, title, description, content, is_active)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              description = VALUES(description),
              content = VALUES(content),
              is_active = VALUES(is_active),
              updated_at = CURRENT_TIMESTAMP
            `,
            [
              categoryId,
              it.title,
              it.description ?? null,
              it.content ?? null,
              toTinyInt(it.is_active)
            ]
          );
        }
      }
    }

    return {
      ok: true,
      seeded: true,
      categories: BASE_CATEGORIES.length,
      items: withItems ? itemsCount : 0
    };
  });
}

module.exports = { seedServicios };
