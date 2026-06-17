-- =====================================================================
-- Phase 6 — Expenditures (accountant-managed operational expenses)
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS expenditures;
CREATE TABLE expenditures (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category      VARCHAR(64)  NOT NULL,                  -- utilities, supplies, salaries, maintenance, misc
  description   VARCHAR(255) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  spent_on      DATE         NOT NULL,
  vendor        VARCHAR(190) DEFAULT NULL,
  payment_method ENUM('cash','bank','cheque','other') NOT NULL DEFAULT 'cash',
  reference     VARCHAR(190) DEFAULT NULL,             -- receipt # / cheque # / txn id
  notes         TEXT         DEFAULT NULL,
  incurred_by   INT UNSIGNED DEFAULT NULL,
  approved_by   INT UNSIGNED DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exp_category (category),
  KEY idx_exp_spent_on (spent_on),
  CONSTRAINT fk_exp_incurred FOREIGN KEY (incurred_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_exp_approved FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
