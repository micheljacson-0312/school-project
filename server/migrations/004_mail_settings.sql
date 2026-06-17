-- =====================================================================
-- Phase 3 — Admin mail setup (SMTP configuration)
-- Passwords are stored encrypted at rest with AES_ENCRYPT using a key
-- from MAIL_ENCRYPTION_KEY env var. Single-row table (id=1).
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS mail_settings;
CREATE TABLE mail_settings (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  driver          ENUM('smtp','ses','mailgun','postmark','log','sendmail') NOT NULL DEFAULT 'log',
  host            VARCHAR(190) DEFAULT NULL,
  port            INT          DEFAULT NULL,
  username        VARCHAR(190) DEFAULT NULL,
  -- password stored as AES_ENCRYPT ciphertext (VARBINARY)
  password_cipher VARBINARY(512) DEFAULT NULL,
  encryption      ENUM('none','tls','ssl') NOT NULL DEFAULT 'tls',
  from_address    VARCHAR(190) DEFAULT NULL,
  from_name       VARCHAR(190) DEFAULT NULL,
  reply_to        VARCHAR(190) DEFAULT NULL,
  is_enabled      TINYINT(1)   NOT NULL DEFAULT 0,
  last_tested_at  TIMESTAMP    NULL DEFAULT NULL,
  last_test_status ENUM('ok','failed','unknown') NOT NULL DEFAULT 'unknown',
  last_test_error VARCHAR(500) DEFAULT NULL,
  updated_by      INT UNSIGNED DEFAULT NULL,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ms_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Singleton row
INSERT INTO mail_settings (id, driver, from_name) VALUES (1, 'log', 'School Platform');

SET FOREIGN_KEY_CHECKS = 1;
