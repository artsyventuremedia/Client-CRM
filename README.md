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

## Security notes

- Payment status must only ever be set from a verified gateway webhook (signature-checked), never from
  a frontend response — the `PaymentTransaction` table has `webhookVerified` and a unique
  `idempotencyKey` for this, but no gateway is wired up yet. Do not add a "mark as paid" path that
  bypasses that when building the invoicing module.
- File downloads must go through signed, access-controlled URLs once object storage is wired up — the
  `Document` model stores a `storageKey`, not a public path, in anticipation of this.
- All authorization is server-side (API route guards); nothing in the client should be trusted for
  access control.

## Known gaps to fix before production

- `User.organizationId + email` and `Role.organizationId + name` uniqueness is enforced by a Prisma
  compound unique index, but Postgres treats `NULL` as distinct in unique indexes — two platform-level
  users (`organizationId = null`) could theoretically collide on email without a DB-level conflict.
  A partial unique index (`WHERE organization_id IS NULL`) should be added via a raw migration before
  the platform-admin surface grows beyond the single seeded super admin.
- No rate limiting on `/api/auth/*` yet (brute-force protection).
- No 2FA (architecture allows for it — `LoginActivity` already tracks login attempts — but no TOTP
  flow is wired up).
