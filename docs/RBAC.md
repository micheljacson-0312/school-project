# RBAC Catalog (Phase 1)

8 system roles, 60+ permissions. The catalog lives in MySQL (`permissions`, `role_permissions`) and is loaded into `req.user.permissions` on every authenticated request.

## Roles

| Key           | Display name        | Notes                                       |
|---------------|---------------------|---------------------------------------------|
| `admin`       | Administrator       | Holds every permission (bypassed at runtime)|
| `coordinator` | Coordinator         | Read-heavy academic oversight               |
| `teacher`     | Teacher             | Owns attendance, LMS, results, remarks      |
| `student`     | Student             | Read their own LMS, results, fees, remarks  |
| `parent`      | Parent / Guardian   | Read child(ren); logs in via CNIC or email  |
| `accountant`  | Accountant          | Fee structures, collection, discounts      |
| `operator`    | Computer Operator   | Document generation, ID cards, certificates |
| `alumni`      | Alumni              | Alumni network                              |

## Permission keying

`<module>.<action>`. Actions are verbs; the most common are `view`, `create`, `edit`, `delete`, `manage`, plus domain-specific verbs (`collect`, `grade`, `upload`, `override`, `host`, `join`).

## Full catalog (seeded)

### User & RBAC
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `roles.manage`

### Academic structure
- `academic.view`, `academic.manage`
- `classes.view`, `classes.manage`
- `subjects.view`, `subjects.manage`

### People
- `students.view`, `students.create`, `students.edit`, `students.delete`
- `teachers.view`, `teachers.create`, `teachers.edit`, `teachers.delete`
- `parents.view`, `parents.manage`

### Attendance
- `attendance.mark`, `attendance.view`, `attendance.report`

### LMS
- `lms.lecture.upload`, `lms.lecture.view`
- `lms.assignment.create`, `lms.assignment.submit`, `lms.assignment.grade`
- `lms.quiz.create`, `lms.quiz.take`, `lms.quiz.grade`
- `lms.liveclass.host`, `lms.liveclass.join`

### Results
- `results.upload`, `results.view`, `results.override`

### Fees
- `fees.structure.manage`, `fees.collect`, `fees.view`, `fees.report`, `fees.discount.manage`

### Evaluations
- `evaluation.create`, `evaluation.respond`, `evaluation.view`
- `remarks.create`, `remarks.view`
- `awards.create`

### Documents
- `documents.generate`, `documents.template.manage`

### Notifications
- `notifications.create`, `notifications.view`

### Website content
- `content.news.manage`, `content.gallery.manage`
- `content.admissions.review`, `content.jobs.review`

### Alumni
- `alumni.view`, `alumni.manage`

### Reports & system
- `reports.view`
- `audit.view`
- `settings.manage`

## Role → permission summary

```
admin       : *
coordinator : academic.view, classes.view, subjects.view,
              students.view, teachers.view,
              attendance.view/report, lms.lecture.view,
              results.view, evaluation.view,
              remarks.create/view, awards.create,
              reports.view, notifications.create/view

teacher     : academic.view, classes.view, subjects.view,
              students.view, teachers.view,
              attendance.mark/view,
              lms.lecture.upload/view,
              lms.assignment.create/grade,
              lms.quiz.create/grade, lms.liveclass.host,
              results.upload/view,
              evaluation.create/view,
              remarks.create/view, awards.create,
              notifications.view

student     : classes.view, subjects.view, attendance.view,
              lms.lecture.view, lms.assignment.submit, lms.quiz.take,
              lms.liveclass.join,
              results.view, fees.view, remarks.view, notifications.view

parent      : students.view, attendance.view, lms.lecture.view,
              results.view, fees.view, remarks.view, notifications.view

accountant  : students.view,
              fees.structure.manage, fees.collect, fees.view, fees.report,
              fees.discount.manage,
              reports.view, notifications.create

operator    : students.view,
              documents.generate, documents.template.manage,
              fees.structure.manage

alumni      : alumni.view, notifications.view
```

## Adding a permission later

1. Add the row to the `permissions` table (`INSERT … ON DUPLICATE KEY UPDATE`).
2. Re-grant to relevant roles via `INSERT IGNORE INTO role_permissions …`.
3. Use `requirePermission('new.permission')` in the route.

No code changes required unless the middleware itself needs extending.
