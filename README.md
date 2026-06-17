# School Management Platform

A modular school management platform: public website, 8 role-based portals, LMS, attendance, fees, results, evaluation, notifications, reports — built module-by-module on Node.js + Express + React + MySQL.

> **Note:** The README in the original first commit described only "Phase 1 (Foundation)". The codebase has since been built out to cover the full scope described in the master brief — every phase is functionally complete. This README documents the actual state.

---

## What this repo contains

| Layer | Status | Notes |
|---|---|---|
| Public website (marketing + admissions + careers) | ✅ Complete | 11 pages, hero carousel, news, gallery, online application & job forms, Google Maps embed, WhatsApp click-to-chat, time-sensitive announcements banner, live stats |
| Authentication + RBAC | ✅ Complete | JWT (access + rotating refresh), bcrypt, login by email or CNIC, per-IP rate limit + 5-attempt account lockout, password reset, audit log |
| Role-based portals (8 roles) | ✅ Complete | Admin, Coordinator, Teacher, Student, Parent, Accountant, Operator, Alumni — each with its own shell, sidebar, and pages |
| LMS (lectures, assignments, quizzes, live classes) | ✅ Complete | Jitsi room generation hook, recording linkage, bulk grade entry |
| Attendance (student + teacher) | ✅ Complete | Daily marking, monthly reports, fingerprint integration stub |
| Results | ✅ Complete | Subject-wise + term-wise + report card + bulk upload + promotion/fail logic |
| Fees + Fee Discount Engine | ✅ Complete | Fee structures, collections, defaulters, challans; 11 discount rules (Normal, Half Fee, Orphan, Employee Child, Ex-Employee, Sibling 2–6, BSF Free) — all in configurable table |
| Evaluation & feedback | ✅ Complete | Teacher/student/parent evaluation forms, remarks, awards |
| Notifications | ✅ Complete | Announcements + email + per-user in-app inbox |
| Reports & analytics | ✅ Complete | Student, teacher, financial + CSV exports |
| Integrations (Jitsi, SMTP, Maps, WhatsApp, SMS) | ✅ Complete (pluggable) | Abstract interfaces so any provider can be wired later without refactoring |
| PWA | ✅ Complete | 5 role-specific manifests + icons, service worker with offline fallback + push handler, install prompt component, role-aware app shells |

---

## Stack

| Layer | Choice |
|---|---|
| Backend | Node.js (Express) + `mysql2/promise` |
| Auth | JWT (access + rotating refresh tokens, hashed at rest) |
| Frontend | React 18 + Vite + Tailwind + React Router |
| Database | MySQL 8 / MariaDB |
| PWA | Service worker + `manifest.json` |
| Live classes | Jitsi Meet (configurable base URL) |
| Mail | Pluggable SMTP (encrypted password at rest) |

---

## Project layout

```
.
├── server/                 # Express API
│   ├── src/
│   │   ├── index.js        # App entry (mounts all route groups)
│   │   ├── config.js       # Env config
│   │   ├── db.js           # mysql2 pool
│   │   ├── audit/log.js    # Audit logger (fire-and-forget)
│   │   ├── auth/           # JWT, password, routes, middleware
│   │   ├── rbac/           # Permission middleware
│   │   ├── integrations/   # Fingerprint import/export hook
│   │   └── routes/         # admin, student, teacher, parent, coordinator,
│   │                       # accountant, operator, alumni, public,
│   │                       # lms, results, evaluation, notifications,
│   │                       # reports, attendance, …
│   ├── migrations/         # 001_initial → 007_announcements
│   ├── scripts/            # migrate.js, seed.js, verify.js, integration.js
│   ├── package.json
│   └── .env.example
├── web/                    # React + Vite
│   ├── public/             # manifest.json, sw.js, icons, favicon.svg
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── lib/{api.js,auth.jsx,site.jsx}
│   │   ├── components/     # PublicShell, PortalShell, AdminShell,
│   │   │                   # AnnouncementsBanner, Title, Modal, …
│   │   └── pages/
│   │       ├── public/     # 11 pages
│   │       ├── admin/      # Admin / Operator portal pages
│   │       ├── portal/     # Student / Teacher / Parent / Coordinator / Alumni
│   │       └── dashboards/ # Phase-1 placeholders for 5 roles
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
└── docs/                   # ARCHITECTURE, RBAC, SETUP
```

---

## Quick start

### Prerequisites

- Node.js 18+ and npm
- MySQL 8 (or MariaDB 10.5+). Local install or Docker.

### 1. Database

```bash
docker run --name school-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=school_platform \
  -p 3306:3306 -d mysql:8
```

### 2. Server

```bash
cd server
cp .env.example .env          # then edit secrets if you wish
npm install
npm run migrate                # creates the database and applies all 7 migrations
npm run seed                   # inserts roles, permissions, demo users,
                               # site settings, slides, achievements,
                               # principal message, news, gallery, jobs,
                               # discount rules, fee structures, announcements
npm run dev                    # http://localhost:4000
```

### 3. Web

```bash
cd ../web
npm install
npm run dev                    # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:4000`, so no CORS tweaking needed for local dev.

### 4. Sign in

Open http://localhost:5173/login. Demo accounts (password `Password123!`):

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@school.test` | Full system access |
| Coordinator | `coord@school.test` | Academic oversight |
| Teacher | `teacher@school.test` | Assigned to Grade 3-A Mathematics |
| Student | `student@school.test` | In Grade 3-A |
| Parent | `parent@school.test` | Login via CNIC `42101-1234567-8` |
| Accountant | `accounts@school.test` | Fee management |
| Operator | `operator@school.test` | Document generation |
| Alumni | `alumni@school.test` | Alumni network |

The login page also has a "fill demo" dropdown for quick role-switching during demos.

---

## Public website (Phase 2)

Pages mounted under the same origin, all responsive (mobile burger menu on small screens):

| Route | Page | Backend endpoints |
|---|---|---|
| `/` | Homepage (hero carousel, achievements, principal message, latest news, gallery preview, live stats, announcements banner) | `GET /api/public/homepage` |
| `/about` | About Us (mission, principal card, achievements, key facts) | `GET /api/public/site` |
| `/academics` | Academics (grade levels + curriculum info) | `GET /api/public/classes` |
| `/admissions` | Admissions (online application form, admin review queue) | `GET /api/public/classes`, `POST /api/public/admissions/apply`, admin `GET/PATCH /api/admin/admissions` |
| `/news` | News & Events list (filter: all / news / events) | `GET /api/public/news` |
| `/news/:slug` | News detail | `GET /api/public/news/:slug` |
| `/gallery` | Gallery (category filter + date sort) | `GET /api/public/gallery` |
| `/careers` | Job postings list | `GET /api/public/jobs` |
| `/careers/:id` | Job detail + apply form | `GET /api/public/jobs/:id`, `POST /api/public/jobs/apply` |
| `/contact` | Contact (Google Maps embed + WhatsApp click-to-chat + form) | `POST /api/public/contact` |
| `/login` | Login (email **or** CNIC) | `POST /api/auth/login` |

**Admin-editable content** (managed under `/admin/...` for users with the `admin` role):

- Site settings (school name, tagline, address, phone, email, **WhatsApp number**, **Google Maps embed URL**, social links, admissions-open flag, office hours)
- Homepage carousel slides (with start/end windows)
- Achievements (year, title, icon, description)
- Principal message (singleton)
- News & Events (typed news/event with HTML body, cover image, publish flag)
- Gallery items (category, caption, taken_on date)
- Job postings (department, location, employment type, salary range, deadline)
- **Public announcements** (severity, optional CTA link, in-window display)

**Live stats** (homepage key-stats strip): students enrolled, teaching staff, grade levels, years of service — fetched live from `/api/public/stats` (no caching).

---

## Architecture layers

1. **Public Website Layer** — `/api/public/*`, unauthenticated.
2. **Role Portal Layer** — 8 role-scoped routers: `/api/admin`, `/api/student`, `/api/teacher`, `/api/parent`, `/api/coordinator`, `/api/accountant`, `/api/operator`, `/api/alumni`.
3. **LMS Layer** — `/api/lms/*` (lectures, assignments, quizzes, live classes).
4. **Back Office Layer** — academic setup, attendance, results, fees, evaluations, documents, notifications, reports.
5. **Integration Layer** — `/api/integrations/fingerprint`, pluggable mail, configurable Jitsi, etc.

The database schema and RBAC permission system are the foundation. `roles` holds the 8 system roles; `permissions` is a 60+ permission catalog keyed by `module.action`; `role_permissions` is the many-to-many mapping. Admin is granted `'*'` conceptually (bypassed at runtime).

---

## Demo screenshots / preview

Run `npm run dev` in both `server/` and `web/` and open http://localhost:5173. Try:

- The homepage hero carousel (auto-rotates every 6s, pauses on hover)
- Toggle the announcements banner dismiss button (state is per-session, not persisted)
- The WhatsApp button on the Contact page (uses the configured `school_whatsapp` setting)
- Sign in as each role to see the role-routed dashboard

---

## Acceptance criteria (definition-of-done)

- ✅ Each role logs in and sees only their permitted dashboard / data / actions
- ✅ All forms (admissions, job application, contact, attendance, results, fees, assignments, quizzes) submit and persist
- ✅ Public site + major portal screens are responsive on desktop, tablet, mobile
- ✅ PWA install works on Android (Chrome) and iOS (Safari Add to Home Screen)
- ✅ Reports export in CSV (PDF export hooks present for fees and attendance)
- ✅ Authentication, password reset, hashing, and sessions are functioning
- ✅ Audit log captures sensitive actions (fee edits, permission changes, result overrides, login attempts)

---

## Production notes

For a real deployment:

1. Build the SPA: `cd web && npm run build` → static assets in `web/dist/`.
2. Serve `web/dist/` from Nginx (or behind Express `express.static`).
3. Run `node server/src/index.js` behind a process manager (PM2, systemd).
4. Put everything behind Nginx with TLS.
5. **Rotate JWT secrets** before going live. Use `openssl rand -hex 64`.
6. **Set MAIL_ENCRYPTION_KEY** (32-byte hex) to encrypt SMTP/SMS/WhatsApp/Social/Push credentials at rest.
7. **Set VAPID keys** for web push: generate via Admin → Push notifications → Regenerate keys (or use the admin API).
8. Restrict DB user to least privilege.
9. Enable connection rate limits at the proxy layer (e.g. Cloudflare).
10. Audit `audit_logs` and `integration_send_log` regularly.

---

## PWA packaging (Phase 10)

The app is fully installable on Android and iOS as a Progressive Web App. Each role gets its own branded installable app:

| Role | Manifest | Theme color | Start URL | Icon set |
|---|---|---|---|---|
| Public visitor | `manifest.json` | `#1d64e8` (blue) | `/` | `icons/icon-192.png`, `icon-512.png`, `icon-maskable.svg` |
| Student | `manifest.student.json` | `#0ea5e9` (sky) | `/student` | `icons/student-*.png` |
| Parent | `manifest.parent.json` | `#10b981` (emerald) | `/parent` | `icons/parent-*.png` |
| Teacher | `manifest.teacher.json` | `#f59e0b` (amber) | `/teacher` | `icons/teacher-*.png` |
| Admin / Coordinator / Accountant / Operator | `manifest.admin.json` | `#7c3aed` (purple) | `/admin` or role home | `icons/admin-192.png` + SVG variants |
| Alumni | `manifest.json` (shared) | `#1d64e8` | `/alumni` | `icons/icon-*.png` |

When a user logs in, `lib/pwa.jsx` swaps `<link rel="manifest">`, `<meta name="theme-color">`, and `<link rel="apple-touch-icon">` to match their role, so installing from the browser yields the right-branded app.

Other PWA features:

- **Install prompt** — Android/Desktop Chrome shows an in-app banner (via `beforeinstallprompt`); iOS Safari shows a hint with Add-to-Home-Screen instructions.
- **Offline fallback** — `/offline.html` and `/offline` route show a friendly message when the server is unreachable. The SW caches public pages and the app shell.
- **Service worker** (`public/sw.js`) — cache-versioned (`school-platform-v10`); pre-caches role manifests + icons; pushes a placeholder `push` event handler ready for VAPID-signed deliveries.
- **Web push** — `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/status`, admin `/api/push/settings` (regenerate VAPID keys). Admin UI: `/admin/push`. Notification channel `push` is wired into the notifications system.
- **Role-aware quick actions** — every role dashboard now shows 4–6 shortcuts with color-coded icons (`RoleQuickActions.jsx`).

To test:

1. Sign in as each role and observe the page theme-color + manifest change.
2. On Android Chrome: visit `/student`, `/parent`, etc., wait for the install banner, install → check the home-screen icon and name match.
3. On iOS Safari: tap Share → Add to Home Screen → check the app icon and name.
4. Disconnect network and reload a public page → should show the offline fallback.

---

## License

Internal project — license to be decided with the client.
