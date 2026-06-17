-- =====================================================================
-- School Management Platform — LMS, Attendance, Results, Evaluations,
-- Notifications, Documents, Website content (news/gallery/admissions/jobs)
-- These tables complete the schema surface area so portals in
-- Phases 2-9 can be built without destructive schema work later.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Attendance (students + teachers)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS teacher_attendance;
CREATE TABLE teacher_attendance (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id  INT UNSIGNED NOT NULL,
  date        DATE         NOT NULL,
  status      ENUM('present','absent','late','leave','holiday') NOT NULL,
  check_in    TIME         DEFAULT NULL,
  check_out   TIME         DEFAULT NULL,
  remarks     VARCHAR(255) DEFAULT NULL,
  marked_by   INT UNSIGNED DEFAULT NULL,
  source      ENUM('manual','fingerprint','import') NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ta_teacher_date (teacher_id, date),
  CONSTRAINT fk_ta_teacher_user FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_marked_by    FOREIGN KEY (marked_by)  REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS student_attendance;
CREATE TABLE student_attendance (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id  INT UNSIGNED NOT NULL,
  class_id    INT UNSIGNED NOT NULL,
  section_id  INT UNSIGNED NOT NULL,
  date        DATE         NOT NULL,
  status      ENUM('present','absent','late','leave','holiday') NOT NULL,
  remarks     VARCHAR(255) DEFAULT NULL,
  marked_by   INT UNSIGNED DEFAULT NULL,
  source      ENUM('manual','fingerprint','import') NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sa_student_date (student_id, date),
  KEY idx_sa_class_section_date (class_id, section_id, date),
  CONSTRAINT fk_sa_student  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_sa_class    FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_sa_section  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_sa_marked   FOREIGN KEY (marked_by)  REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- LMS: lectures, live classes, assignments, quizzes
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS lectures;
CREATE TABLE lectures (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id    INT UNSIGNED NOT NULL,
  subject_id    INT UNSIGNED NOT NULL,
  class_id      INT UNSIGNED NOT NULL,
  section_id    INT UNSIGNED NOT NULL,
  session_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(190) NOT NULL,
  description   TEXT         DEFAULT NULL,
  file_url      VARCHAR(255) DEFAULT NULL,
  duration_min  INT          DEFAULT NULL,
  recorded_at   TIMESTAMP    NULL DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lectures_class_section_subject (class_id, section_id, subject_id),
  CONSTRAINT fk_lec_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lec_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lec_class   FOREIGN KEY (class_id)   REFERENCES classes(id)           ON DELETE CASCADE,
  CONSTRAINT fk_lec_section FOREIGN KEY (section_id) REFERENCES sections(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lec_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS live_classes;
CREATE TABLE live_classes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id    INT UNSIGNED NOT NULL,
  subject_id    INT UNSIGNED NOT NULL,
  class_id      INT UNSIGNED NOT NULL,
  section_id    INT UNSIGNED NOT NULL,
  session_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(190) NOT NULL,
  -- Jitsi: room name is generated deterministically per session
  jitsi_room    VARCHAR(128) NOT NULL,
  starts_at     TIMESTAMP    NOT NULL,
  ends_at       TIMESTAMP    DEFAULT NULL,
  status        ENUM('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jitsi_room (jitsi_room),
  KEY idx_lc_starts (starts_at),
  CONSTRAINT fk_lc_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lc_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lc_class   FOREIGN KEY (class_id)   REFERENCES classes(id)           ON DELETE CASCADE,
  CONSTRAINT fk_lc_section FOREIGN KEY (section_id) REFERENCES sections(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lc_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS assignments;
CREATE TABLE assignments (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id    INT UNSIGNED NOT NULL,
  subject_id    INT UNSIGNED NOT NULL,
  class_id      INT UNSIGNED NOT NULL,
  section_id    INT UNSIGNED NOT NULL,
  session_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(190) NOT NULL,
  description   TEXT         DEFAULT NULL,
  total_marks   DECIMAL(7,2) NOT NULL DEFAULT 100.00,
  due_at        TIMESTAMP    NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assign_due (due_at),
  CONSTRAINT fk_asg_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)          ON DELETE CASCADE,
  CONSTRAINT fk_asg_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)          ON DELETE CASCADE,
  CONSTRAINT fk_asg_class   FOREIGN KEY (class_id)   REFERENCES classes(id)           ON DELETE CASCADE,
  CONSTRAINT fk_asg_section FOREIGN KEY (section_id) REFERENCES sections(id)          ON DELETE CASCADE,
  CONSTRAINT fk_asg_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS assignment_submissions;
CREATE TABLE assignment_submissions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignment_id  INT UNSIGNED NOT NULL,
  student_id     INT UNSIGNED NOT NULL,
  file_url       VARCHAR(255) DEFAULT NULL,
  notes          TEXT         DEFAULT NULL,
  submitted_at   TIMESTAMP    NULL DEFAULT NULL,
  marks_obtained DECIMAL(7,2) DEFAULT NULL,
  graded_by      INT UNSIGNED DEFAULT NULL,
  graded_at      TIMESTAMP    NULL DEFAULT NULL,
  feedback       TEXT         DEFAULT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_asub_unique (assignment_id, student_id),
  CONSTRAINT fk_asub_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_asub_student    FOREIGN KEY (student_id)    REFERENCES students(id)    ON DELETE CASCADE,
  CONSTRAINT fk_asub_grader     FOREIGN KEY (graded_by)     REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS quizzes;
CREATE TABLE quizzes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id    INT UNSIGNED NOT NULL,
  subject_id    INT UNSIGNED NOT NULL,
  class_id      INT UNSIGNED NOT NULL,
  section_id    INT UNSIGNED NOT NULL,
  session_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(190) NOT NULL,
  total_marks   DECIMAL(7,2) NOT NULL DEFAULT 100.00,
  available_from TIMESTAMP   NOT NULL,
  available_to   TIMESTAMP   NOT NULL,
  time_limit_min INT         DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_qz_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)          ON DELETE CASCADE,
  CONSTRAINT fk_qz_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)          ON DELETE CASCADE,
  CONSTRAINT fk_qz_class   FOREIGN KEY (class_id)   REFERENCES classes(id)           ON DELETE CASCADE,
  CONSTRAINT fk_qz_section FOREIGN KEY (section_id) REFERENCES sections(id)          ON DELETE CASCADE,
  CONSTRAINT fk_qz_session FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS quiz_questions;
CREATE TABLE quiz_questions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id      INT UNSIGNED NOT NULL,
  prompt       TEXT         NOT NULL,
  type         ENUM('mcq','truefalse','short','essay') NOT NULL DEFAULT 'mcq',
  options_json JSON         DEFAULT NULL,            -- for mcq: [{key,text}]
  correct_key  VARCHAR(64)  DEFAULT NULL,
  marks        DECIMAL(7,2) NOT NULL DEFAULT 1.00,
  position     INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_qq_quiz (quiz_id),
  CONSTRAINT fk_qq_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS quiz_attempts;
CREATE TABLE quiz_attempts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id      INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED NOT NULL,
  started_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP    NULL DEFAULT NULL,
  score        DECIMAL(7,2) DEFAULT NULL,
  answers_json JSON         DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_qa_quiz_student (quiz_id, student_id),
  CONSTRAINT fk_qa_quiz    FOREIGN KEY (quiz_id)    REFERENCES quizzes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_qa_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS results;
CREATE TABLE results (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id   INT UNSIGNED NOT NULL,
  subject_id   INT UNSIGNED NOT NULL,
  term_id      INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NOT NULL,
  marks_obtained DECIMAL(7,2) DEFAULT NULL,
  total_marks    DECIMAL(7,2) NOT NULL DEFAULT 100.00,
  grade          VARCHAR(8)   DEFAULT NULL,
  remarks        VARCHAR(255) DEFAULT NULL,
  uploaded_by    INT UNSIGNED DEFAULT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_results_unique (student_id, subject_id, term_id, session_id),
  CONSTRAINT fk_res_student FOREIGN KEY (student_id)   REFERENCES students(id)         ON DELETE CASCADE,
  CONSTRAINT fk_res_subject FOREIGN KEY (subject_id)   REFERENCES subjects(id)         ON DELETE CASCADE,
  CONSTRAINT fk_res_term    FOREIGN KEY (term_id)      REFERENCES terms(id)            ON DELETE CASCADE,
  CONSTRAINT fk_res_session FOREIGN KEY (session_id)   REFERENCES academic_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Evaluations, remarks, awards
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS evaluation_forms;
CREATE TABLE evaluation_forms (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(190) NOT NULL,
  audience    ENUM('students','teachers','parents') NOT NULL,
  schema_json JSON         NOT NULL,                 -- form definition (questions, scales)
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_by  INT UNSIGNED DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ef_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS evaluation_responses;
CREATE TABLE evaluation_responses (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  form_id     INT UNSIGNED NOT NULL,
  respondent_id INT UNSIGNED NOT NULL,
  target_id   INT UNSIGNED DEFAULT NULL,             -- student/teacher being evaluated
  answers_json JSON        NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_er_form (form_id),
  CONSTRAINT fk_er_form FOREIGN KEY (form_id) REFERENCES evaluation_forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS student_remarks;
CREATE TABLE student_remarks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id  INT UNSIGNED NOT NULL,
  author_id   INT UNSIGNED NOT NULL,
  category    ENUM('behavior','performance','general','commendation') NOT NULL DEFAULT 'general',
  body        TEXT         NOT NULL,
  is_visible_to_parent TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sr_student (student_id),
  CONSTRAINT fk_sr_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_author  FOREIGN KEY (author_id)  REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS awards;
CREATE TABLE awards (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id  INT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  description TEXT         DEFAULT NULL,
  awarded_by  INT UNSIGNED DEFAULT NULL,
  awarded_at  DATE         NOT NULL,
  PRIMARY KEY (id),
  KEY idx_award_student (student_id),
  CONSTRAINT fk_award_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_award_by      FOREIGN KEY (awarded_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Notifications (in-app + email/SMS as feature flags)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  audience      ENUM('all','students','teachers','parents','staff','role') NOT NULL DEFAULT 'all',
  audience_role_id INT UNSIGNED DEFAULT NULL,
  title         VARCHAR(190) NOT NULL,
  body          TEXT         NOT NULL,
  channel       ENUM('inapp','email','sms','push') NOT NULL DEFAULT 'inapp',
  category      ENUM('announcement','academic','fee','event','emergency') NOT NULL DEFAULT 'announcement',
  created_by    INT UNSIGNED DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_audience (audience, audience_role_id),
  KEY idx_notif_created (created_at),
  CONSTRAINT fk_notif_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS notification_reads;
CREATE TABLE notification_reads (
  notification_id BIGINT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED   NOT NULL,
  read_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT fk_nr_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_nr_user  FOREIGN KEY (user_id)         REFERENCES users(id)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Documents (ID cards, certificates) — templates + generated instances
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS document_templates;
CREATE TABLE document_templates (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name     VARCHAR(64)  NOT NULL,                 -- 'student_id_card', 'certificate'
  display_name VARCHAR(190) NOT NULL,
  html_template MEDIUMTEXT  NOT NULL,
  fields_json  JSON         DEFAULT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc_tpl_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS generated_documents;
CREATE TABLE generated_documents (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id  INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED DEFAULT NULL,
  staff_id     INT UNSIGNED DEFAULT NULL,
  payload_json JSON         DEFAULT NULL,
  file_url     VARCHAR(255) DEFAULT NULL,
  generated_by INT UNSIGNED DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gd_template (template_id),
  CONSTRAINT fk_gd_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_gd_student  FOREIGN KEY (student_id)  REFERENCES students(id)          ON DELETE SET NULL,
  CONSTRAINT fk_gd_staff    FOREIGN KEY (staff_id)    REFERENCES staff(id)             ON DELETE SET NULL,
  CONSTRAINT fk_gd_user     FOREIGN KEY (generated_by) REFERENCES users(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Public website content (news, events, gallery, admissions, jobs)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS news_events;
CREATE TABLE news_events (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type         ENUM('news','event') NOT NULL DEFAULT 'news',
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL,
  excerpt      VARCHAR(500) DEFAULT NULL,
  body         MEDIUMTEXT   DEFAULT NULL,
  cover_image  VARCHAR(255) DEFAULT NULL,
  event_date   DATE         DEFAULT NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 0,
  published_at TIMESTAMP    NULL DEFAULT NULL,
  created_by   INT UNSIGNED DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ne_slug (slug),
  KEY idx_ne_published (is_published, published_at),
  CONSTRAINT fk_ne_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS gallery_items;
CREATE TABLE gallery_items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category     VARCHAR(64)  DEFAULT NULL,             -- 'sports','academics','events'
  caption      VARCHAR(255) DEFAULT NULL,
  media_url    VARCHAR(255) NOT NULL,
  media_type   ENUM('image','video') NOT NULL DEFAULT 'image',
  taken_on     DATE         DEFAULT NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gallery_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS admission_applications;
CREATE TABLE admission_applications (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_name  VARCHAR(190) NOT NULL,
  parent_name     VARCHAR(190) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  phone           VARCHAR(32)  NOT NULL,
  applying_class_id INT UNSIGNED NOT NULL,
  date_of_birth   DATE         DEFAULT NULL,
  previous_school VARCHAR(255) DEFAULT NULL,
  address         VARCHAR(255) DEFAULT NULL,
  notes           TEXT         DEFAULT NULL,
  status          ENUM('new','under_review','accepted','rejected','waitlisted') NOT NULL DEFAULT 'new',
  reviewed_by     INT UNSIGNED DEFAULT NULL,
  reviewed_at     TIMESTAMP    NULL DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aa_status (status),
  CONSTRAINT fk_aa_class    FOREIGN KEY (applying_class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_aa_reviewer FOREIGN KEY (reviewed_by)       REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS job_applications;
CREATE TABLE job_applications (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  position     VARCHAR(190) NOT NULL,
  full_name    VARCHAR(190) NOT NULL,
  email        VARCHAR(190) NOT NULL,
  phone        VARCHAR(32)  NOT NULL,
  cnic         VARCHAR(32)  DEFAULT NULL,
  experience   VARCHAR(255) DEFAULT NULL,
  cover_letter TEXT         DEFAULT NULL,
  cv_file_url  VARCHAR(255) DEFAULT NULL,
  status       ENUM('new','under_review','shortlisted','rejected','hired') NOT NULL DEFAULT 'new',
  reviewed_by  INT UNSIGNED DEFAULT NULL,
  reviewed_at  TIMESTAMP    NULL DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ja_status (status),
  CONSTRAINT fk_ja_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(190) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  phone       VARCHAR(32)  DEFAULT NULL,
  subject     VARCHAR(190) DEFAULT NULL,
  message     TEXT         NOT NULL,
  ip          VARCHAR(64)  DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
