-- src/modules/medicinaGeneral/medicinaGeneral.sql
-- ============================================================
-- SERVIMEL — Medicina General (DB)
-- Tablas:
--   mg_headers
--   mg_diagnoses
--   mg_medications
--   mg_controls
--   mg_exams
--   mg_evolution
--   mg_documents
--   mg_alerts
-- ============================================================

CREATE TABLE IF NOT EXISTS mg_headers (
  resident_id INT NOT NULL,
  blood_group VARCHAR(8) NULL,
  rh VARCHAR(2) NULL,
  weight_kg DECIMAL(6,2) NULL,
  height_cm DECIMAL(6,2) NULL,
  bmi DECIMAL(5,2) NULL,

  allergies_json JSON NULL,
  chronic_json JSON NULL,

  active_diagnoses_summary VARCHAR(255) NULL,
  risk_level ENUM('ALTO','MEDIO','BAJO') NOT NULL DEFAULT 'BAJO',
  treating_doctor VARCHAR(120) NULL,
  last_medical_eval DATE NULL,
  general_notes TEXT NULL,

  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (resident_id),
  INDEX idx_mg_headers_risk (risk_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_diagnoses (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  cie10 VARCHAR(16) NULL,
  name VARCHAR(180) NOT NULL,
  diag_date DATE NULL,
  status ENUM('ACTIVO','CONTROLADO','RESUELTO') NOT NULL DEFAULT 'ACTIVO',
  notes TEXT NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_diag_resident (resident_id),
  INDEX idx_mg_diag_status (status),
  INDEX idx_mg_diag_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_medications (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  name VARCHAR(160) NOT NULL,
  dose VARCHAR(60) NULL,
  schedule VARCHAR(80) NULL,
  route VARCHAR(16) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  instructions TEXT NULL,
  status ENUM('ACTIVO','SUSPENDIDO','FINALIZADO') NOT NULL DEFAULT 'ACTIVO',
  prescribed_by VARCHAR(120) NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_meds_resident (resident_id),
  INDEX idx_mg_meds_status (status),
  INDEX idx_mg_meds_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_controls (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  control_date DATE NOT NULL,
  type ENUM('RUTINA','URGENCIA','SEGUIMIENTO') NOT NULL DEFAULT 'RUTINA',
  reason VARCHAR(255) NULL,
  findings TEXT NULL,
  conclusion TEXT NULL,
  next_control DATE NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_ctrl_resident (resident_id),
  INDEX idx_mg_ctrl_date (control_date),
  INDEX idx_mg_ctrl_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_exams (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  exam_date DATE NOT NULL,
  type VARCHAR(120) NOT NULL,
  result VARCHAR(255) NULL,
  notes TEXT NULL,
  file_name VARCHAR(220) NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_exam_resident (resident_id),
  INDEX idx_mg_exam_date (exam_date),
  INDEX idx_mg_exam_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_evolution (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  evo_date DATE NOT NULL,
  type ENUM('RUTINA','SEGUIMIENTO','URGENCIA') NOT NULL DEFAULT 'RUTINA',
  professional VARCHAR(120) NULL,
  note TEXT NOT NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_evo_resident (resident_id),
  INDEX idx_mg_evo_date (evo_date),
  INDEX idx_mg_evo_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_documents (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  doc_date DATE NOT NULL,
  type VARCHAR(120) NOT NULL,
  file_name VARCHAR(220) NOT NULL,
  notes TEXT NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_doc_resident (resident_id),
  INDEX idx_mg_doc_date (doc_date),
  INDEX idx_mg_doc_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================

CREATE TABLE IF NOT EXISTS mg_alerts (
  id INT NOT NULL AUTO_INCREMENT,
  resident_id INT NOT NULL,

  alert_date DATE NOT NULL,
  kind VARCHAR(140) NOT NULL,
  detail VARCHAR(255) NULL,
  level ENUM('INFO','WARN','CRIT') NOT NULL DEFAULT 'WARN',
  resolved TINYINT(1) NOT NULL DEFAULT 0,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_mg_alert_resident (resident_id),
  INDEX idx_mg_alert_date (alert_date),
  INDEX idx_mg_alert_active (is_active),
  INDEX idx_mg_alert_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
