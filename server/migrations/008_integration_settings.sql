-- =====================================================================
-- Phase 9 — Integration provider settings
-- One row per provider (singleton). Stores config + (optionally) an
-- encrypted credential. Adapter modules read these rows at runtime.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- SMS gateway (Twilio / Nexmo / Plivo / generic HTTP / log driver)
DROP TABLE IF EXISTS sms_settings;
CREATE TABLE sms_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  driver ENUM('log','twilio','nexmo','plivo','generic_http') NOT NULL DEFAULT 'log',
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  account_sid VARCHAR(190) DEFAULT NULL,        -- twilio
  auth_token_enc VARCHAR(255) DEFAULT NULL,    -- encrypted at rest
  from_number VARCHAR(64) DEFAULT NULL,
  api_url VARCHAR(255) DEFAULT NULL,           -- generic_http
  api_key VARCHAR(255) DEFAULT NULL,           -- generic_http (encrypted)
  updated_by INT UNSIGNED DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sms_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp Business API (Meta Cloud API or any provider with a similar shape)
DROP TABLE IF EXISTS whatsapp_settings;
CREATE TABLE whatsapp_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider ENUM('click_to_chat','meta_cloud','twilio') NOT NULL DEFAULT 'click_to_chat',
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  phone_number_id VARCHAR(64) DEFAULT NULL,    -- Meta: the sender phone id
  business_account_id VARCHAR(64) DEFAULT NULL,
  access_token_enc VARCHAR(255) DEFAULT NULL,  -- encrypted at rest
  api_version VARCHAR(16) DEFAULT 'v18.0',
  updated_by INT UNSIGNED DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_wa_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Social media auto-posting (one row per provider)
DROP TABLE IF EXISTS social_settings;
CREATE TABLE social_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform ENUM('facebook','twitter','linkedin','instagram') NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  access_token_enc VARCHAR(255) DEFAULT NULL,
  page_or_handle VARCHAR(190) DEFAULT NULL,
  updated_by INT UNSIGNED DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_social_platform (platform),
  CONSTRAINT fk_social_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log of integration activity (separate from audit_logs so we can keep
-- provider-specific context like message ids, recipient, response codes)
DROP TABLE IF EXISTS integration_send_log;
CREATE TABLE integration_send_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel ENUM('email','sms','whatsapp','social') NOT NULL,
  provider VARCHAR(32) NOT NULL,
  recipient VARCHAR(255) DEFAULT NULL,
  subject VARCHAR(255) DEFAULT NULL,
  payload_json MEDIUMTEXT DEFAULT NULL,
  status ENUM('sent','failed','queued','dry_run') NOT NULL,
  response_code VARCHAR(64) DEFAULT NULL,
  error_message VARCHAR(1000) DEFAULT NULL,
  actor_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_isl_channel (channel, created_at),
  KEY idx_isl_status (status, created_at),
  CONSTRAINT fk_isl_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Seed defaults so the providers come up in a sane dev state.
INSERT INTO sms_settings (id, driver, is_enabled, from_number)
  VALUES (1, 'log', 0, NULL) ON DUPLICATE KEY UPDATE id=id;
INSERT INTO whatsapp_settings (id, provider, is_enabled, api_version)
  VALUES (1, 'click_to_chat', 0, 'v18.0') ON DUPLICATE KEY UPDATE id=id;
INSERT INTO social_settings (platform, is_enabled, page_or_handle) VALUES
  ('facebook',  0, NULL),
  ('twitter',   0, NULL),
  ('linkedin',  0, NULL),
  ('instagram', 0, NULL)
  ON DUPLICATE KEY UPDATE platform=platform;
