-- =====================================================================
-- Phase 5 — Evaluation forms: extend audience enum + add role-targeted option
-- =====================================================================

ALTER TABLE evaluation_forms
  MODIFY COLUMN audience ENUM('all','students','teachers','parents','staff','role') NOT NULL DEFAULT 'all',
  ADD COLUMN audience_role_id INT UNSIGNED DEFAULT NULL AFTER audience,
  ADD CONSTRAINT fk_ef_audience_role FOREIGN KEY (audience_role_id) REFERENCES roles(id) ON DELETE SET NULL;
