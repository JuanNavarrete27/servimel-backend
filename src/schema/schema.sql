-- SERVIMEL schema (MySQL 8+)
-- UTC timestamps recommended. Ensure MySQL time_zone = '+00:00' where possible.

CREATE DATABASE IF NOT EXISTS servimel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE servimel;

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('admin','enfermeria','medico') NOT NULL DEFAULT 'enfermeria',
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(120) NULL,
  last_name VARCHAR(120) NULL,
  phone VARCHAR(40) NULL,
  avatar_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB;

-- =========================
-- USER SETTINGS
-- =========================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT UNSIGNED NOT NULL,
  theme ENUM('dark','light','dim') NOT NULL DEFAULT 'dark',
  high_contrast TINYINT(1) NOT NULL DEFAULT 0,
  compact_mode TINYINT(1) NOT NULL DEFAULT 0,
  animations TINYINT(1) NOT NULL DEFAULT 1,
  dna_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.20,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- RESIDENTS
-- =========================
CREATE TABLE IF NOT EXISTS residents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  document_number VARCHAR(40) NULL,
  room VARCHAR(40) NULL,
  status ENUM('estable','observacion','critico') NOT NULL DEFAULT 'estable',
  emergency_contact_name VARCHAR(120) NULL,
  emergency_contact_phone VARCHAR(40) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_residents_active (is_active),
  KEY idx_residents_status (status),
  KEY idx_residents_lastname (last_name),
  KEY idx_residents_document (document_number),
  KEY idx_residents_room (room)
) ENGINE=InnoDB;

-- =========================
-- VITALS
-- =========================
CREATE TABLE IF NOT EXISTS vitals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  taken_at DATETIME NOT NULL,
  temp_c DECIMAL(4,1) NULL,
  bp_systolic SMALLINT NULL,
  bp_diastolic SMALLINT NULL,
  hr SMALLINT NULL,
  rr SMALLINT NULL,
  spo2 SMALLINT NULL,
  pain TINYINT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vitals_resident_date (resident_id, taken_at),
  KEY idx_vitals_user (user_id),
  CONSTRAINT fk_vitals_resident FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_vitals_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- MEDICATIONS (events: administered/pending/late/suspended)
-- =========================
CREATE TABLE IF NOT EXISTS medications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  drug_name VARCHAR(190) NOT NULL,
  dose VARCHAR(120) NULL,
  route VARCHAR(120) NULL,
  status ENUM('administered','pending','late','suspended') NOT NULL DEFAULT 'pending',
  scheduled_at DATETIME NOT NULL,
  administered_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_meds_resident_date (resident_id, scheduled_at),
  KEY idx_meds_status (status),
  KEY idx_meds_user (user_id),
  CONSTRAINT fk_meds_resident FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_meds_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- OBSERVATIONS
-- =========================
CREATE TABLE IF NOT EXISTS observations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('normal','alerta') NOT NULL DEFAULT 'normal',
  observed_at DATETIME NOT NULL,
  text TEXT NOT NULL,
  resolved_at DATETIME NULL,
  resolved_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_obs_resident_date (resident_id, observed_at),
  KEY idx_obs_type (type),
  KEY idx_obs_resolved (resolved_at),
  CONSTRAINT fk_obs_resident FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_obs_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_obs_resolved_user FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- TIMELINE EVENTS (clinical history)
-- =========================
CREATE TABLE IF NOT EXISTS timeline_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('vital','medication','observation','profile','other') NOT NULL,
  ref_table VARCHAR(50) NOT NULL,
  ref_id BIGINT UNSIGNED NOT NULL,
  severity ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  title VARCHAR(190) NOT NULL,
  summary VARCHAR(500) NULL,
  occurred_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_timeline_resident_date (resident_id, occurred_at),
  KEY idx_timeline_severity (severity),
  KEY idx_timeline_type (event_type),
  CONSTRAINT fk_timeline_resident FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_timeline_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- AUDITS
-- =========================
CREATE TABLE IF NOT EXISTS audits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(300) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audits_module (module),
  KEY idx_audits_action (action),
  KEY idx_audits_entity (entity),
  KEY idx_audits_user (user_id),
  KEY idx_audits_created (created_at),
  CONSTRAINT fk_audits_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;
