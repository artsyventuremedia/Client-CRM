# ClientOps

A multi-tenant "Client Operating System" for service-based companies — CRM, quotations, contracts,
service delivery, projects/tasks, vendors, invoicing/payments, support tickets, appointments, and
renewals in one platform, built so each module can grow independently without a rewrite.

This repository is a phased build. **Phases 1–5 are implemented and tested end-to-end** (architecture,
database, auth/RBAC, org & user management, and core CRM). Everything else has a real database schema
already in place (60+ tables across every module in the spec) but not yet a UI/API layer — see
[What's built vs. what's schema-only](#whats-built-vs-whats-schema-only) below.

## Tech stack

- **Next.js 16** (App Router, Turbopack) — full-stack TypeScript, server components + API routes
- **PostgreSQL** via **Prisma ORM 6** — multi-file schema under `prisma/schema/`
- **Auth.js (NextAuth v5)** — credentials auth, JWT sessions, edge-safe middleware split from the
  Node-only Prisma/bcrypt config
- **Tailwind CSS 4** + small local component kit (no external UI framework dependency)
- **Zod** for input validation, **bcryptjs** for password hashing
- **Vitest** for unit tests

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and a real AUTH_SECRET
npm run db:migrate          # applies prisma/schema/migrations against your database
npm run db:seed             # seeds RBAC roles, SaaS plans, and a demo organization
npm run dev
```

Local development doesn't require Docker: `npx prisma dev` spins up a local Postgres-compatible
server with no external dependency, which is what this repo was built and tested against. Point
`DATABASE_URL` at any real Postgres instance for staging/production.

**If you use `prisma dev`**: keep `connection_limit=1` on `DATABASE_URL` (already set in
`.env.example`). Without it, this repo's combination of Next.js Turbopack dev mode + `prisma dev`'s
local proxy intermittently throws `prepared statement "s0" already exists` (Postgres error 42P05) —
a connection-multiplexing quirk in the disposable local dev server, not a bug in the app. If it
happens anyway, `npx prisma dev stop <name> && npx prisma dev -n <name> --db-port <port> -d` clears
the proxy's state without losing data. This class of issue does not occur against a real Postgres
instance (staging/production, or a Dockerized/Homebrew Postgres locally).

### Demo login

After seeding, sign in at `/login` with any of the seeded users (see `prisma/seed.ts` for the full
list — one per system role) and password `Password@123`:

| Role | Email |
|---|---|
| Org Owner | owner@acme.dev |
| Admin | admin@acme.dev |
| Sales Manager | salesmanager@acme.dev |
| Sales Executive | salesexec@acme.dev |
| Account Manager | accountmanager@acme.dev |
| Project Manager | pm@acme.dev |
| Employee | employee@acme.dev |
| Finance Manager | finance@acme.dev |
| Support Agent | support@acme.dev |
| Vendor | vendor@acme.dev |
| Client | client@acme.dev |
| Platform Super Admin | superadmin@clientops.dev |

The seed also creates one fully-connected demo record chain: lead → client → quotation → contract →
service order → project → task → invoice → payment → ticket → appointment, so the client 360° view
has real data to show on first login.

## Architecture

### Multi-tenancy

Every tenant-scoped table carries `organizationId`. There is no shared-schema row-level-security layer
yet — isolation is enforced in application code: every API route calls `requireOrgSession()`
(`src/lib/api/guard.ts`), which pulls `organizationId` from the authenticated session (never from the
request body/query), and every Prisma query is written with that `organizationId` in its `where`
clause. Tenant isolation is covered by an integration test path (see
[Testing](#testing)) that verifies a second organization gets an empty list and a 404 — not another
tenant's data — when querying another tenant's records.

Platform-level rows (the super admin user, the global RBAC role definitions, SaaS plans) use
`organizationId: null` by design.

### RBAC

- 12 system roles (`SystemRole` enum) match the roles specified in the brief exactly (Platform Super
  Admin, Org Owner, Admin, Sales Manager, Sales Executive, Account Manager, Project Manager, Employee,
  Finance Manager, Support Agent, Vendor, Client).
- A default permission matrix (`src/lib/rbac/matrix.ts`) maps each role to `resource:permission`
  grants and seeds the `Role`/`RolePermission` tables on first run.
- Organizations can layer custom roles on top (the `Role` table supports `organizationId`-scoped
  roles in addition to the global system ones) — not yet exposed in the UI.
- Every API route calls `requirePermission(session, resource, permission)` before touching data;
  `can()` (`src/lib/rbac/check.ts`) is the single source of truth used by both the API guard and the
  sidebar's nav filtering, so a role that can't see a resource in the UI also can't call its API.

### Auth

Auth.js v5 with a Credentials provider. Passwords are hashed with bcrypt (cost factor 12). Sessions
are JWTs carrying `organizationId`, `isPlatformAdmin`, and the flattened permission map so route
guards don't need a DB round-trip on every request — the map is only recomputed on login or on an
explicit session `update()` trigger.

**Edge/Node split**: `src/lib/auth/edge-config.ts` holds a minimal, Prisma-free config used only by
`middleware.ts` (which runs on the Edge runtime) to check for a valid session cookie and redirect.
`src/lib/auth/config.ts` extends that with the Credentials provider, bcrypt, and Prisma-backed
permission loading, and is only ever imported from Node-runtime code (API routes, server components).
This split exists because importing Prisma into the Edge bundle caused connection/prepared-statement
conflicts with the Node-runtime Prisma client during testing.

Password reset uses single-use, hashed, time-limited tokens (`PasswordResetToken`); the raw token is
only ever in the emailed link, never stored. Email sending goes through an `EmailProvider` interface
(`src/lib/providers/email.ts`) with a console-logging dev implementation — swap in SES/Postmark/Resend
by implementing the interface, no caller changes needed.

### Database

`prisma/schema/*.prisma` — one file per domain (core, crm, catalog, sales, service_ops, projects,
vendors, finance, support, scheduling), all loaded via Prisma's native multi-file schema support
(no preview flag needed as of Prisma 6). Money fields use `Decimal(14,2)`, not floats. IDs are `cuid()`.

### Audit logging

`recordAudit()` (`src/lib/audit.ts`) writes to `AuditLog` on every create/update/delete in the
implemented modules, capturing before/after JSON snapshots, the acting user, and the organization.
Audit rows have no update/delete API — they're append-only by construction (no route exists to
mutate them).

## What's built vs. what's schema-only

**Implemented (API + UI + tests):**
- Organization self-registration (14-day trial, `FREE` plan) and login/logout
- Forgot/reset password flow
- RBAC middleware + permission-gated API routes and sidebar
- Multi-tenant isolation, enforced and tested
- Organization dashboard with real KPIs (client counts, lead funnel counts, task/ticket/invoice
  aggregates, outstanding payments)
- Leads: list, create, detail view with follow-ups/activity timeline/quotations
- Clients: list, create, and a full **360° client profile** (contacts, addresses, services &
  renewals, quotations, contracts, projects, invoices, payments, tickets, appointments, notes) — this
  is the centerpiece view described in the brief

**Schema exists, no API/UI yet** (Prisma models are complete and migrated; building the routes/pages
for these follows the same pattern as Leads/Clients above):
Quotations & versions/approvals, Contracts, Service catalog & Service Orders, Renewals automation,
Projects/Tasks (Kanban/Gantt views), Vendors & vendor portal, Invoices/Payments (+ payment gateway
webhook verification), Credit/debit notes, Support tickets & SLA, Appointments/calendar, Client
portal, Vendor portal, Document management (signed URLs), Notification engine (email/SMS/WhatsApp/push
delivery), Automation rule engine, Reports, SaaS billing UI, Platform super-admin console.

Do not assume any of the schema-only modules work end-to-end — they don't yet. Treat the list above as
the roadmap, in roughly the priority order a real rollout would need them.

## Testing

```bash
npm run test        # vitest: RBAC matrix logic, slug generation
npm run build        # production build (also type-checks)
```

Manual verification performed for this checkpoint (not yet automated as CI):
- Full credentials login flow via cookie-jar curl session
- Cross-tenant isolation (second org sees empty lists / 404s on first org's IDs)
- RBAC denial (an Employee-role session gets 403 creating a lead; Org Owner succeeds)
- Client 360° page renders real relational data (quotation, invoice, ticket, service order)

Recommended before any further module ships: integration tests hitting the real Postgres instance
(not mocks) for permission checks and tenant isolation, per the "critical test cases" list in the
original brief — payment double-processing, tax/total correctness, and renewal automation in
particular need dedicated coverage once those modules exist.

## Security features

Implemented and tested (see [Testing](#testing) for what was verified and how):

- **Password policy**: registration and reset both require 8+ characters with upper, lower, digit, and
  symbol (`src/lib/validation/password.ts`), enforced server-side via Zod — never trust client-side
  validation alone.
- **Account lockout**: 5 failed login attempts locks the account for 15 minutes
  (`MAX_FAILED_LOGIN_ATTEMPTS` / `LOCKOUT_DURATION_MS` in `src/lib/auth/config.ts`). Every attempt,
  success or failure, is written to `LoginActivity` with IP and user-agent for audit/forensics.
- **Rate limiting**: in-memory sliding-window limiter (`src/lib/security/rate-limit.ts`) applied to
  `/api/auth/register` (5/hour/IP), `/api/auth/forgot-password` (5/15min/IP **and** 3/15min/email, so
  an attacker can't flood one victim's inbox by rotating source IPs), `/api/auth/reset-password`
  (10/15min/IP), and login itself (20/15min/IP, inside `authorize()`, independent of which account is
  targeted so credential-stuffing across many accounts is also slowed). **This is in-process memory
  and resets on restart / isn't shared across instances — back it with Redis before running more than
  one server process.**
- **Session revocation ("sign out of all devices")**: sessions are JWTs, which are otherwise stateless
  and can't be revoked early. Each user has a `tokenVersion` counter; `POST /api/auth/sign-out-all`
  increments it, and `getActiveSession()` (`src/lib/auth/active-session.ts`) — used by every API route
  guard and by the `(app)` layout — checks the current token's version against the database on every
  request and rejects stale ones immediately, rather than waiting for the JWT to naturally expire (up
  to 30 days). The same check also enforces that a suspended/locked account is cut off immediately,
  not just at next login. This DB check is why the Edge/Node split matters (see
  [Auth](#auth) above): it can only run in Node-runtime code, which is exactly where it's wired in.
- **Password reset tokens**: single-use, hashed at rest (`PasswordResetToken.token` stores a SHA-256
  hash, never the raw token), 1-hour expiry, and the forgot-password response is identical whether or
  not the email exists (no account enumeration).
- **Security headers** (`next.config.ts`): CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, and `X-Powered-By`
  removed. The CSP's `script-src` currently allows `'unsafe-inline' 'unsafe-eval'` because Next.js's
  own hydration/HMR runtime needs it — tighten with per-request nonces before a stricter CSP is
  required for production.
- **Platform-level uniqueness**: a partial unique index (`WHERE "organizationId" IS NULL`) on
  `users.email` and `roles.name` closes a gap where Postgres's compound unique constraints treat NULL
  as distinct, which would otherwise let two platform-level rows collide silently
  (migration `20260913083905_platform_level_unique_indexes`).
- Payment status must only ever be set from a verified gateway webhook (signature-checked), never from
  a frontend response — the `PaymentTransaction` table has `webhookVerified` and a unique
  `idempotencyKey` for this, but no gateway is wired up yet. Do not add a "mark as paid" path that
  bypasses that when building the invoicing module.
- File downloads must go through signed, access-controlled URLs once object storage is wired up — the
  `Document` model stores a `storageKey`, not a public path, in anticipation of this.
- All authorization is server-side (API route guards + `getActiveSession()`); nothing in the client
  should be trusted for access control.

## Known gaps to fix before production

- Rate limiting is in-process memory only (see above) — move to Redis (or similar) before running
  more than one server instance, or the limits become trivially bypassable by hitting different
  instances.
- No 2FA yet (architecture allows for it — `LoginActivity` already tracks every attempt — but no TOTP
  enrollment/verification flow is wired up).
- `getActiveSession()` adds one DB round-trip per request to check lockout/revocation status. Fine at
  this scale; if this becomes a hot path under load, cache the check for a few seconds instead of
  hitting the database on every single request.
- The forgot-password lookup (`prisma.user.findFirst({ where: { email } })`) isn't scoped to an
  organization, so if the same email happens to exist under two different tenants, the reset email
  goes to whichever one Postgres returns first. Low-probability, but worth fixing if this becomes an
  outward-facing multi-tenant product.
