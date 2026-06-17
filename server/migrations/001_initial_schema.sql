-- =====================================================================
-- School Management Platform — Initial Schema
-- Phase 1: Foundation (users, RBAC, academic structure, fee skeleton,
-- audit logs). Other modules plug into this schema without further
-- destructive migrations. Add new migrations as 002_*, 003_*, etc.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ---------------------------------------------------------------------
-- RBAC: roles + permissions + role_permissions mapping
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name        VARCHAR(64)  NOT NULL,                -- e.g. 'admin', 'teacher'
  display_name    VARCHAR(128) NOT NULL,                -- e.g. 'Administrator'
  description     VARCHAR(255) DEFAULT NULL,
  is_system       TINYINT(1)   NOT NULL DEFAULT 1,      -- system roles cannot be deleted
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name        VARCHAR(128) NOT NULL,                -- e.g. 'students.view'
  module          VARCHAR(64)  NOT NULL,                -- e.g. 'students'
  action          VARCHAR(64)  NOT NULL,                -- e.g. 'view'
  display_name    VARCHAR(255) NOT NULL,
  description     VARCHAR(255) DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_key (key_name),
  KEY idx_permissions_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id         INT UNSIGNED NOT NULL,
  permission_id   INT UNSIGNED NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Users + profile extensions per role
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  role_id           INT UNSIGNED  NOT NULL,
  email             VARCHAR(190)  NOT NULL,
  password_hash     VARCHAR(255)  NOT NULL,
  -- Optional CNIC-based login (parents can log in via CNIC per brief)
  cnic              VARCHAR(32)   DEFAULT NULL,
  full_name         VARCHAR(190)  NOT NULL,
  phone             VARCHAR(32)   DEFAULT NULL,
  avatar_url        VARCHAR(255)  DEFAULT NULL,
  status            ENUM('active','inactive','suspended','pending') NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMP     NULL DEFAULT NULL,
  last_login_at     TIMESTAMP     NULL DEFAULT NULL,
  failed_attempts   INT UNSIGNED  NOT NULL DEFAULT 0,
  locked_until      TIMESTAMP     NULL DEFAULT NULL,
  remember_token    VARCHAR(100)  DEFAULT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_cnic  (cnic),
  KEY idx_users_role (role_id),
  KEY idx_users_status (status),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens
DROP TABLE IF EXISTS password_resets;
CREATE TABLE password_resets (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,                   -- sha256 of the random token
  expires_at  TIMESTAMP    NOT NULL,
  used_at     TIMESTAMP    NULL DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pr_user (user_id),
  KEY idx_pr_token (token_hash),
  CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens (rotation capable)
DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  ip          VARCHAR(64)  DEFAULT NULL,
  expires_at  TIMESTAMP    NOT NULL,
  revoked_at  TIMESTAMP    NULL DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rt_user (user_id),
  KEY idx_rt_token (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS academic_sessions;
CREATE TABLE academic_sessions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(64)  NOT NULL,                  -- e.g. '2025-2026'
  start_date   DATE         NOT NULL,
  end_date     DATE         NOT NULL,
  is_current   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS terms;
CREATE TABLE terms (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id   INT UNSIGNED NOT NULL,
  name         VARCHAR(64)  NOT NULL,                  -- e.g. 'Term 1', 'Midterm', 'Final'
  start_date   DATE         NOT NULL,
  end_date     DATE         NOT NULL,
  is_current   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_terms_session_name (session_id, name),
  CONSTRAINT fk_terms_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS classes;
CREATE TABLE classes (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(64)  NOT NULL,                  -- e.g. 'Grade 1', 'Class 10'
  level        INT          NOT NULL,                  -- numeric ordering (1..12)
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_name (name),
  UNIQUE KEY uq_classes_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS sections;
CREATE TABLE sections (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(32)  NOT NULL,                  -- e.g. 'A', 'B', 'Blue'
  capacity     INT          NOT NULL DEFAULT 40,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sections_class_name (class_id, name),
  CONSTRAINT fk_sections_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS subjects;
CREATE TABLE subjects (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(128) NOT NULL,
  code         VARCHAR(32)  DEFAULT NULL,
  is_optional  TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_class_name (class_id, name),
  CONSTRAINT fk_subjects_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Role-specific profile extensions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS students;
CREATE TABLE students (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  admission_no    VARCHAR(64)  NOT NULL,
  roll_no         VARCHAR(32)  DEFAULT NULL,
  class_id        INT UNSIGNED NOT NULL,
  section_id      INT UNSIGNED NOT NULL,
  session_id      INT UNSIGNED NOT NULL,
  date_of_birth   DATE         DEFAULT NULL,
  gender          ENUM('male','female','other') DEFAULT NULL,
  address         VARCHAR(255) DEFAULT NULL,
  guardian_name   VARCHAR(190) DEFAULT NULL,
  guardian_phone  VARCHAR(32)  DEFAULT NULL,
  admission_date  DATE         NOT NULL,
  status          ENUM('active','graduated','transferred','struck_off') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_admission_no (admission_no),
  UNIQUE KEY uq_students_user (user_id),
  KEY idx_students_class (class_id),
  KEY idx_students_section (section_id),
  CONSTRAINT fk_students_user    FOREIGN KEY (user_id)    REFERENCES users(id)            ON DELETE CASCADE,
  CONSTRAINT fk_students_class   FOREIGN KEY (class_id)   REFERENCES classes(id)         ON DELETE RESTRICT,
  CONSTRAINT fk_students_section FOREIGN KEY (section_id) REFERENCES sections(id)        ON DELETE RESTRICT,
  CONSTRAINT fk_students_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS teachers;
CREATE TABLE teachers (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  employee_code   VARCHAR(64)  NOT NULL,
  designation     VARCHAR(128) DEFAULT NULL,
  qualification   VARCHAR(190) DEFAULT NULL,
  joining_date    DATE         DEFAULT NULL,
  status          ENUM('active','on_leave','resigned','terminated') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teachers_employee_code (employee_code),
  UNIQUE KEY uq_teachers_user (user_id),
  CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher ↔ Subject ↔ Class/Section assignment
DROP TABLE IF EXISTS teacher_assignments;
CREATE TABLE teacher_assignments (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id   INT UNSIGNED NOT NULL,
  subject_id   INT UNSIGNED NOT NULL,
  class_id     INT UNSIGNED NOT NULL,
  section_id   INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ta_unique (teacher_id, subject_id, class_id, section_id, session_id),
  CONSTRAINT fk_ta_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ta_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ta_class   FOREIGN KEY (class_id)   REFERENCES classes(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ta_section FOREIGN KEY (section_id) REFERENCES sections(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ta_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS parents;
CREATE TABLE parents (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  occupation      VARCHAR(128) DEFAULT NULL,
  cnic            VARCHAR(32)  DEFAULT NULL,
  address         VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parents_user (user_id),
  KEY idx_parents_cnic (cnic),
  CONSTRAINT fk_parents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parent ↔ Student relationship (many-to-many — siblings etc.)
DROP TABLE IF EXISTS parent_student;
CREATE TABLE parent_student (
  parent_id     INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  relation      ENUM('father','mother','guardian','other') NOT NULL DEFAULT 'guardian',
  is_primary    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (parent_id, student_id),
  CONSTRAINT fk_ps_parent  FOREIGN KEY (parent_id)  REFERENCES parents(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ps_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  employee_code   VARCHAR(64)  NOT NULL,
  department      VARCHAR(128) DEFAULT NULL,
  designation     VARCHAR(128) DEFAULT NULL,
  joining_date    DATE         DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_user (user_id),
  UNIQUE KEY uq_staff_employee_code (employee_code),
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS alumni;
CREATE TABLE alumni (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED DEFAULT NULL,
  full_name       VARCHAR(190) NOT NULL,
  passing_year    INT          NOT NULL,
  batch_name      VARCHAR(64)  DEFAULT NULL,
  profession      VARCHAR(190) DEFAULT NULL,
  organization    VARCHAR(190) DEFAULT NULL,
  city            VARCHAR(128) DEFAULT NULL,
  country         VARCHAR(128) DEFAULT NULL,
  email           VARCHAR(190) DEFAULT NULL,
  phone           VARCHAR(32)  DEFAULT NULL,
  bio             TEXT         DEFAULT NULL,
  is_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_alumni_batch (batch_name),
  KEY idx_alumni_year  (passing_year),
  CONSTRAINT fk_alumni_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Fee management skeleton (configurable discount rules, not hardcoded)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS fee_discount_rules;
CREATE TABLE fee_discount_rules (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name          VARCHAR(64)  NOT NULL,             -- 'orphan','half_fee','employee_child', etc.
  display_name      VARCHAR(128) NOT NULL,
  discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- 0..100
  requires_siblings INT          NOT NULL DEFAULT 0,    -- 0 = no, else min siblings
  priority          INT          NOT NULL DEFAULT 0,    -- higher wins on conflict
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  notes             VARCHAR(255) DEFAULT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fee_discount_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS fee_structures;
CREATE TABLE fee_structures (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id    INT UNSIGNED NOT NULL,
  class_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(128) NOT NULL,                 -- 'Monthly', 'Annual', 'Tuition Q1'
  amount        DECIMAL(12,2) NOT NULL,
  due_day       TINYINT      NOT NULL DEFAULT 10,      -- day of month
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fs_session_class (session_id, class_id),
  CONSTRAINT fk_fs_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fs_class   FOREIGN KEY (class_id)   REFERENCES classes(id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS student_fee_discounts;
CREATE TABLE student_fee_discounts (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      INT UNSIGNED NOT NULL,
  fee_structure_id INT UNSIGNED DEFAULT NULL,         -- NULL = applies to all
  discount_rule_id INT UNSIGNED NOT NULL,
  valid_from      DATE         NOT NULL,
  valid_to        DATE         DEFAULT NULL,
  approved_by     INT UNSIGNED DEFAULT NULL,
  approved_at     TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_sfd_student (student_id),
  CONSTRAINT fk_sfd_student  FOREIGN KEY (student_id)      REFERENCES students(id)           ON DELETE CASCADE,
  CONSTRAINT fk_sfd_structure FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id)   ON DELETE CASCADE,
  CONSTRAINT fk_sfd_rule     FOREIGN KEY (discount_rule_id)  REFERENCES fee_discount_rules(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sfd_approver FOREIGN KEY (approved_by)       REFERENCES users(id)               ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS fee_collections;
CREATE TABLE fee_collections (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      INT UNSIGNED NOT NULL,
  fee_structure_id INT UNSIGNED NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,             -- gross amount billed
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_amount      DECIMAL(12,2) NOT NULL,             -- amount - discount
  paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  due_date        DATE         NOT NULL,
  status          ENUM('unpaid','partial','paid','overdue','waived') NOT NULL DEFAULT 'unpaid',
  challan_no      VARCHAR(64)  DEFAULT NULL,
  collected_by    INT UNSIGNED DEFAULT NULL,
  collected_at    TIMESTAMP    NULL DEFAULT NULL,
  notes           VARCHAR(255) DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_challan (challan_no),
  KEY idx_fc_student (student_id),
  KEY idx_fc_status (status),
  CONSTRAINT fk_fc_student  FOREIGN KEY (student_id)       REFERENCES students(id)       ON DELETE CASCADE,
  CONSTRAINT fk_fc_structure FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fc_collector FOREIGN KEY (collected_by)     REFERENCES users(id)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Audit log for sensitive actions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id      INT UNSIGNED DEFAULT NULL,
  actor_email   VARCHAR(190) DEFAULT NULL,
  action        VARCHAR(128) NOT NULL,                 -- e.g. 'fee.update'
  entity_type   VARCHAR(64)  DEFAULT NULL,
  entity_id     INT UNSIGNED DEFAULT NULL,
  ip            VARCHAR(64)  DEFAULT NULL,
  user_agent    VARCHAR(255) DEFAULT NULL,
  meta          JSON         DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_action (action),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
