# School Management Platform — Phase 1 (Foundation)

A modular school management platform: public website, 8 role-based portals, LMS, attendance, fees, results, evaluation, notifications, reports — built module-by-module.

This repository contains **Phase 1 (Foundation)**:

- Complete database schema (users, RBAC, academic structure, fees, attendance, LMS, evaluations, notifications, content, audit)
- RBAC permission system (`roles`, `permissions`, `role_permissions`)
- JWT authentication with refresh-token rotation and password reset flow
- Login (email **or** CNIC) with per-IP rate limiting and account lockout
- Role-scoped route stubs for all 8 portals
- React + Vite + Tailwind frontend with login + role-routed placeholder dashboards
- Audit logging for sensitive actions
- Seed data with demo users (one per role), academic structure, fee discount rules

## Stack

| Layer        | Choice                                       |
|--------------|----------------------------------------------|
| Backend      | Node.js (Express) + `mysql2/promise`         |
| Auth         | JWT (access + rotating refresh tokens)       |
| Frontend     | React 18 + Vite + Tailwind + React Router    |
| Database     | MySQL 8 / MariaDB                            |

## Project layout

```
.
├── server/                 # Express API
│   ├── src/
│   │   ├── index.js        # App entry
│   │   ├── config.js       # Env config
│   │   ├── db.js           # mysql2 pool
│   │   ├── audit/log.js    # Audit logger
│   │   ├── auth/           # JWT, password, routes, middleware
│   │   ├── rbac/           # Permission middleware
│   │   └── routes/         # admin, student, teacher, parent, coordinator,
│   │                       # accountant, operator, alumni, public
│   ├── migrations/         # SQL schema
│   ├── scripts/            # migrate.js, seed.js
│   ├── package.json
│   └── .env.example
├── web/                    # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── lib/{api.js,auth.jsx}
│   │   ├── components/{DashboardShell.jsx,ProtectedRoute.jsx}
│   │   ├── pages/LoginPage.jsx
│   │   └── pages/dashboards/*.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
└── docs/                   # ARCHITECTURE, RBAC, SETUP
```

## Quick start

### Prerequisites

- Node.js 18+ and npm
- MySQL 8 (or MariaDB 10.5+). Local install or Docker.

### 1. Database

```bash
docker run --name school-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=school_platform -p 3306:3306 -d mysql:8
```

### 2. Server

```bash
cd server
cp .env.example .env          # then edit secrets if you wish
npm install
npm run migrate                # creates the database and applies schema
npm run seed                   # inserts roles, permissions, demo users
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

Open <http://localhost:5173/login>. Demo accounts (password `Password123!`):

| Role          | Email                       | Notes                              |
|---------------|-----------------------------|------------------------------------|
| Admin         | `admin@school.test`         | Full system access                 |
| Coordinator   | `coord@school.test`         | Academic oversight                 |
| Teacher       | `teacher@school.test`       | Assigned to Grade 3-A Mathematics  |
| Student       | `student@school.test`       | In Grade 3-A                       |
| Parent        | `parent@school.test`        | Login via CNIC `42101-1234567-8`   |
| Accountant    | `accounts@school.test`      | Fee summary on dashboard           |
| Operator      | `operator@school.test`      | Document generation portal         |
| Alumni        | `alumni@school.test`        | Alumni network                     |

## Build phases

This repo ships **only Phase 1 (Foundation)**. Subsequent phases add:

1. ✅ Schema + RBAC + Auth             ← this repo
2. ⏳ Public Website
3. ⏳ Admin Portal + Academic Setup (real UI)
4. ⏳ Student / Teacher / Parent portals + LMS core
5. ⏳ Attendance + Results + Evaluation
6. ⏳ Fees (Accountant) + Fee Discount Engine
7. ⏳ Coordinator + Operator + Alumni portals (real UI)
8. ⏳ Notifications + Reports & Analytics
9. ⏳ Integration wiring (Jitsi, SMTP, Maps, WhatsApp, SMS, fingerprint)
10. ⏳ PWA packaging
11. ⏳ QA + staging deploy

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full layering and [`docs/RBAC.md`](docs/RBAC.md) for the permission catalog.

## License

Internal project — license to be decided with the client.
