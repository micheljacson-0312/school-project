-- =====================================================================
-- Phase 2 — Public-facing website content
-- Site settings (school info), homepage slides, achievements,
-- principal message, and open job postings.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Site-wide settings (key/value with a type tag)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS site_settings;
CREATE TABLE site_settings (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name     VARCHAR(64)  NOT NULL,
  value        MEDIUMTEXT   DEFAULT NULL,
  type         ENUM('string','text','json','integer','boolean','url') NOT NULL DEFAULT 'string',
  description  VARCHAR(255) DEFAULT NULL,
  updated_by   INT UNSIGNED DEFAULT NULL,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ss_key (key_name),
  CONSTRAINT fk_ss_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Homepage carousel / hero slides (admin-editable)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS homepage_slides;
CREATE TABLE homepage_slides (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(190) NOT NULL,
  subtitle     VARCHAR(255) DEFAULT NULL,
  image_url    VARCHAR(255) DEFAULT NULL,
  cta_label    VARCHAR(64)  DEFAULT NULL,
  cta_href     VARCHAR(255) DEFAULT NULL,
  position     INT          NOT NULL DEFAULT 0,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  starts_at    TIMESTAMP    NULL DEFAULT NULL,
  ends_at      TIMESTAMP    NULL DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hs_position (position),
  KEY idx_hs_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Achievements (homepage + About page)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS achievements;
CREATE TABLE achievements (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year         INT          NOT NULL,
  title        VARCHAR(190) NOT NULL,
  description  VARCHAR(500) DEFAULT NULL,
  icon         VARCHAR(64)  DEFAULT 'trophy',             -- trophy|medal|star|book|flask
  position     INT          NOT NULL DEFAULT 0,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a_position (position),
  KEY idx_a_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Principal's message (singleton row)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS principal_message;
CREATE TABLE principal_message (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,    -- always id=1 in practice
  principal_name VARCHAR(190) NOT NULL,
  designation    VARCHAR(190) DEFAULT NULL,
  photo_url      VARCHAR(255) DEFAULT NULL,
  message_body   MEDIUMTEXT   NOT NULL,
  signature_url  VARCHAR(255) DEFAULT NULL,
  updated_by     INT UNSIGNED DEFAULT NULL,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pm_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Job postings (open positions, public can apply)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS job_postings;
CREATE TABLE job_postings (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title            VARCHAR(190) NOT NULL,
  department       VARCHAR(128) DEFAULT NULL,
  location         VARCHAR(128) DEFAULT NULL,
  employment_type  ENUM('full_time','part_time','contract','visiting','internship') NOT NULL DEFAULT 'full_time',
  description      MEDIUMTEXT   NOT NULL,
  requirements     MEDIUMTEXT   DEFAULT NULL,
  salary_range     VARCHAR(64)  DEFAULT NULL,
  apply_deadline   DATE         DEFAULT NULL,
  is_published     TINYINT(1)   NOT NULL DEFAULT 0,
  published_at     TIMESTAMP    NULL DEFAULT NULL,
  created_by       INT UNSIGNED DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jp_published (is_published, published_at),
  CONSTRAINT fk_jp_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
