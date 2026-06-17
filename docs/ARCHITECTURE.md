# Architecture

## Layers

1. **Public Website Layer** — visitors, applicants, parents, community. Mounted at `/api/public/*`.
2. **Role Portal Layer** — 8 role-scoped routers: `/api/admin`, `/api/student`, `/api/teacher`, `/api/parent`, `/api/coordinator`, `/api/accountant`, `/api/operator`, `/api/alumni`.
3. **LMS Layer** — tables for `lectures`, `live_classes`, `assignments`, `quizzes` (Phase 4 work).
4. **Back Office Layer** — academic setup, attendance, results, fees, evaluations, documents, notifications, reports (Phases 3–8 work).
5. **Integration Layer** — feature-flagged plugins for Jitsi, SMTP, Maps, WhatsApp, SMS, fingerprint, social (Phase 9).

## Auth flow

1. Client POSTs `{ identifier, password }` to `/api/auth/login`. `identifier` may be email **or** CNIC (parents).
2. Server validates, hashes via bcrypt, issues JWT access token (short TTL) **and** a refresh token (rotating, revocable, hashed at rest in `refresh_tokens`).
3. Client keeps access token in memory and refresh token in `localStorage`. Each API call sends `Authorization: Bearer <access>`.
4. On 401 with expired access, client calls `/api/auth/refresh` and retries. Refresh tokens are rotated; the previous one is revoked.
5. `/api/auth/logout` revokes the active refresh token and all sessions for the user.

## RBAC

- `roles` holds the 8 system roles. System roles cannot be deleted.
- `permissions` is a catalog keyed by `<module>.<action>` (e.g. `students.view`, `fees.collect`).
- `role_permissions` is the many-to-many mapping. Admin is granted `'*'` (logical — implementation bypasses the lookup).
- `requireAuth()` middleware loads the user **and** their permission set on every request (cached per-request, not per-route).
- `requireRole(...)` enforces role membership on a route.
- `requirePermission('x.y')` enforces a single permission (admin bypassed). `requireAnyPermission(...)` allows multiple.

Audit-sensitive actions (login, password reset, fee edits, permission changes, result overrides) write to `audit_logs` via `src/audit/log.js`. The logger is fire-and-forget so it never breaks the request path.

## Data flow (Phase 1)

```
Browser  ──login──►  Express ──mysql2──►  MySQL
   ▲                    │
   └──JWT───────────────┘
```

Vite dev server proxies `/api/*` to Express. In production, the SPA is served as static files from the same origin (or via reverse proxy).

## Database design notes

- Every entity has explicit `created_at` / `updated_at` columns.
- Soft states are encoded with `status` ENUMs, never boolean flags — easier to extend later (e.g. `on_hold`).
- Foreign keys use `RESTRICT` on profile lookups (you can't delete a class while students reference it) and `CASCADE` on ownership (deleting a user removes their profile).
- Fee discount logic is a **configurable rules table** (`fee_discount_rules`) with `priority` and `requires_siblings`. No hardcoded percent constants.
- Audit log captures `actor_id`, `action`, `entity_type`, `entity_id`, `ip`, `user_agent`, and a JSON `meta` blob for context.
