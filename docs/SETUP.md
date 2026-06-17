# Setup guide

## Prerequisites

- Node.js 18 or newer
- MySQL 8.x or MariaDB 10.5+

## Database

### Option A: Docker (recommended for local dev)

```bash
docker run --name school-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=school_platform \
  -p 3306:3306 -d mysql:8
```

### Option B: Existing MySQL

Create the database:

```sql
CREATE DATABASE school_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Create a user (optional but recommended):

```sql
CREATE USER 'school'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON school_platform.* TO 'school'@'localhost';
FLUSH PRIVILEGES;
```

Then put the credentials in `server/.env`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=school
DB_PASSWORD=change-me
DB_NAME=school_platform
```

## Server

```bash
cd server
cp .env.example .env
# Edit JWT_ACCESS_SECRET / JWT_REFRESH_SECRET to long random strings.
npm install
npm run migrate      # creates tables
npm run seed         # inserts roles, permissions, demo data
npm run dev          # http://localhost:4000
```

### Endpoints

- `GET  /health` — DB ping
- `POST /api/auth/login`         — `{ identifier, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh`       — `{ refreshToken }` → rotated pair
- `POST /api/auth/logout`        — `{ refreshToken }` (optional)
- `POST /api/auth/forgot-password` — `{ identifier }` (always returns ok)
- `POST /api/auth/reset-password`  — `{ token, newPassword }`
- `GET  /api/auth/me`             — current user with permissions

Role portals (each requires auth + role + permissions):

- `/api/admin/dashboard`, `/api/admin/permissions`, `/api/admin/roles`
- `/api/student/dashboard`
- `/api/teacher/dashboard`
- `/api/parent/dashboard`
- `/api/coordinator/dashboard`
- `/api/accountant/dashboard`
- `/api/operator/dashboard`
- `/api/alumni/dashboard`, `/api/alumni/search?q=…`

Public endpoints (no auth):

- `GET  /api/public/news`, `/api/public/news/:slug`
- `GET  /api/public/gallery?category=…`
- `GET  /api/public/classes`
- `POST /api/public/contact`
- `POST /api/public/admissions/apply`
- `POST /api/public/jobs/apply`

## Web

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

Vite proxies `/api/*` → `http://localhost:4000`. No extra config needed.

## Production

For a real deployment:

1. Build the SPA: `cd web && npm run build` → static assets in `web/dist/`.
2. Serve `web/dist/` from Nginx (or behind Express `express.static`).
3. Run `node server/src/index.js` behind a process manager (PM2, systemd).
4. Put everything behind Nginx with TLS.
5. **Rotate JWT secrets** before going live. Use `openssl rand -hex 64`.
6. Restrict DB user to least privilege (drop `DROP` if not needed).
7. Enable connection rate limits at the proxy layer (e.g. Cloudflare).
8. Audit `audit_logs` regularly.

## Adding modules later

The foundation is structured so each module can land independently:

- New portal endpoint → add a file under `server/src/routes/<role>.js` and mount it in `server/src/index.js`.
- New permission → add to the seed file (or insert manually) and use `requirePermission(...)` in routes.
- New table → add `server/migrations/00N_*.sql` (it will be picked up by `npm run migrate`).
- New frontend page → add under `web/src/pages/…` and register a route in `web/src/App.jsx`.

## Troubleshooting

- **`ER_ACCESS_DENIED_ERROR`** — wrong DB credentials in `server/.env`.
- **`ECONNREFUSED 127.0.0.1:3306`** — MySQL not running, or wrong port.
- **`invalid_credentials`** despite correct password — re-run `npm run seed` (or check that `users.status='active'`).
- **CORS errors in browser** — add the dev URL to `CORS_ORIGIN` in `server/.env`, then restart the server.
- **Token expired immediately** — ensure system clock is correct on both server and client; check `JWT_ACCESS_TTL`.
