-- ============================================================
-- SERVIMEL — Fisioterapia (tablas)
-- resident_physio: resumen/estado por residente
-- physio_sessions: sesiones
-- physio_notes: notas clínicas
-- ============================================================

CREATE TABLE IF NOT EXISTS resident_physio (
  resident_id INT NOT NULL,
  status ENUM('sin-plan','en-plan','pendiente','alta') NOT NULL DEFAULT 'sin-plan',
  plan_summary TEXT NULL,
  last_session_date DATE NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (resident_id),
  INDEX idx_resident_physio_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS physio_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,
  session_date DATE NOT NULL,
  session_type ENUM('movilidad','fuerza','respiratorio','otros') NOT NULL DEFAULT 'otros',
  duration_min INT NOT NULL DEFAULT 0,
  objective VARCHAR(255) NULL,
  result_text TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_physio_sessions_resident (resident_id, session_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS physio_notes (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,
  note_date DATE NOT NULL,
  author_name VARCHAR(120) NULL,
  note_text TEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_physio_notes_resident (resident_id, note_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Si querés FK, activalo cuando tengas claro el nombre de tu tabla residentes:
-- ALTER TABLE resident_physio
--   ADD CONSTRAINT fk_resident_physio_resident FOREIGN KEY (resident_id) REFERENCES residentes(id) ON DELETE CASCADE;
-- ALTER TABLE physio_sessions
--   ADD CONSTRAINT fk_physio_sessions_resident FOREIGN KEY (resident_id) REFERENCES residentes(id) ON DELETE CASCADE;
-- ALTER TABLE physio_notes
--   ADD CONSTRAINT fk_physio_notes_resident FOREIGN KEY (resident_id) REFERENCES residentes(id) ON DELETE CASCADE;
