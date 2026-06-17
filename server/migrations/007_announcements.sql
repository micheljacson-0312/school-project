-- =====================================================================
-- Phase 2 (enhancement) — Time-sensitive public announcements
-- A slim announcement is distinct from a news article: it is a short
-- notice ("School closed Monday", "Exam schedule released") with an
-- optional CTA. Designed for the homepage banner / marquee.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS announcements;
CREATE TABLE announcements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  body VARCHAR(1000) DEFAULT NULL,
  link_label VARCHAR(64) DEFAULT NULL,      -- e.g. "Read more"
  link_href VARCHAR(255) DEFAULT NULL,      -- e.g. "/news/xyz"
  severity ENUM('info','success','warning','danger') NOT NULL DEFAULT 'info',
  starts_at TIMESTAMP NULL DEFAULT NULL,    -- visible window
  ends_at   TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a_active_window (is_active, starts_at, ends_at),
  CONSTRAINT fk_a_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
