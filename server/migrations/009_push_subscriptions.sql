-- =====================================================================
-- Phase 10 — Web Push subscriptions
-- Each row is a device/browser subscription for a user. To send a push,
-- the server reads endpoint + p256dh + auth keys and POSTs to endpoint
-- using VAPID auth (configured at runtime).
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS push_subscriptions;
CREATE TABLE push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(64) NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ps_endpoint (endpoint(255)),
  KEY idx_ps_user (user_id, is_active),
  CONSTRAINT fk_ps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push settings (singleton) — stores VAPID public/private keys (private
-- encrypted at rest) and a global on/off toggle. New VAPID keys can be
-- generated via the admin UI; the private key is encrypted using
-- MAIL_ENCRYPTION_KEY the same way as SMTP credentials.
DROP TABLE IF EXISTS push_settings;
CREATE TABLE push_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  vapid_subject VARCHAR(255) DEFAULT 'mailto:admin@school.test',
  vapid_public_key VARCHAR(255) DEFAULT NULL,
  vapid_private_key_enc VARCHAR(255) DEFAULT NULL,
  updated_by INT UNSIGNED DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_push_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO push_settings (id, is_enabled) VALUES (1, 0) ON DUPLICATE KEY UPDATE id=id;
