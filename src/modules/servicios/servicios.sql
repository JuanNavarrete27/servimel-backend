-- src/modules/servicios/servicios.sql
-- ============================================================
-- SERVIMEL — Servicios (DB real)
-- Tablas:
--   - service_categories
--   - service_items
-- Con:
--   ✅ slugs únicos
--   ✅ FK + cascadas seguras
--   ✅ índices para listar/buscar
--   ✅ seed idempotente (categorías + ítems base opcionales)
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- TABLE: service_categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_categories_slug (slug),
  KEY idx_service_categories_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- TABLE: service_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  description VARCHAR(2000) NULL,
  content LONGTEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  -- Evita duplicados "idénticos" por categoría (idempotencia de seed)
  UNIQUE KEY uq_service_items_category_title (category_id, title),

  KEY idx_service_items_category_active_created (category_id, is_active, created_at),
  KEY idx_service_items_active_created (is_active, created_at),

  CONSTRAINT fk_service_items_category
    FOREIGN KEY (category_id) REFERENCES service_categories(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- SEED: categorías (idempotente)
-- Slugs esperados por tu backend:
--   medicina-general | yoga | ed-fisica | cocina | fisioterapia
-- ------------------------------------------------------------
INSERT INTO service_categories (slug, name, description, is_active)
VALUES
  ('medicina-general', 'Medicina General', 'Consultas, controles y seguimiento clínico.', 1),
  ('yoga',             'Yoga',            'Sesiones, respiración, movilidad y bienestar.', 1),
  ('ed-fisica',        'Educación Física', 'Rutinas, ejercicios guiados y actividad física.', 1),
  ('cocina',           'Cocina',           'Menús, dietas, planificación y recetas internas.', 1),
  ('fisioterapia',     'Fisioterapia',     'Rehabilitación, movilidad y tratamiento kinésico.', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- SEED: ítems base opcionales (idempotente)
-- (Si no querés ítems, podés borrar esta sección)
-- ------------------------------------------------------------

-- Medicina General
INSERT INTO service_items (category_id, title, description, content, is_active)
SELECT c.id, 'Protocolo de control diario', 'Chequeos básicos y registro clínico.', 'Incluye: signos vitales, revisión general, y criterios de derivación.', 1
FROM service_categories c WHERE c.slug = 'medicina-general'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  content = VALUES(content),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO service_items (category_id, title, description, content, is_active)
SELECT c.id, 'Guía de medicación segura', 'Buenas prácticas para administración y seguimiento.', 'Verificar: paciente correcto, dosis, vía, horario, y registro en sistema.', 1
FROM service_categories c WHERE c.slug = 'medicina-general'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  content = VALUES(content),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- Yoga
INSERT INTO service_items (category_id, title, description, content, is_active)
SELECT c.id, 'Sesión suave (30 min)', 'Movilidad + respiración + relajación.', 'Estructura: entrada en calor, posturas suaves, respiración, relajación final.', 1
FROM service_categories c WHERE c.slug = 'yoga'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  content = VALUES(content),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- Educación Física
INSERT INTO service_items (category_id, title, description, content, is_active)
SELECT c.id, 'Rutina funcional básica', 'Circuito simple y adaptable.', 'Sentadillas asistidas, caminata, movilidad articular, estiramientos guiados.', 1
FROM service_categories c WHERE c.slug = 'ed-fisica'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  content = VALUES(content),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- Cocina
INSERT INTO service_items (category_id, title, description, content, is_active)
SELECT c.id, 'Menú semanal (base)', 'Planificación general de comidas.', 'Desayuno/almuerzo/merienda/cena. Ajustar según indicación médica y necesidades.', 1
FROM service_categories c WHERE c.slug = 'cocina'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  content = VALUES(content),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO service_items (category_id, title, description, content, is_active)
SELECT c.id, 'Dietas y restricciones', 'Lista rápida de consideraciones.', 'Sin sal / diabético / blando / triturado / hidratación. Confirmar siempre indicación.', 1
FROM service_categories c WHERE c.slug = 'cocina'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  content = VALUES(content),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
