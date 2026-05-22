# Supabase Exit Plan

## Purpose

This document defines a practical migration plan to remove direct Supabase dependency from the application, including auth replacement, database ownership, and a low-risk cutover path.

## Scope

In scope:

* Replace Supabase Auth with Discord-first auth owned by this app.
* Replace Supabase client data access with app-owned server APIs and a direct Postgres layer.
* Migrate operational tooling and local/dev environments to Docker Compose.
* Preserve existing behaviour for permissions, group membership, character ownership, and auditability.

Out of scope for initial migration:

* Feature redesign.
* Large UI refactors unrelated to auth/data ownership.
* Immediate storage redesign unless required by bucket/file dependencies.

## Current Baseline (Phase 0 Discovery)

Findings from repository inspection:

* Supabase is deeply coupled in app/runtime code and tests (200+ direct references in `src` were observed before search output cap).
* Supabase environment usage appears across runtime and scripts (42 references to `NEXT_PUBLIC_SUPABASE*` / `SUPABASE_*` across source/docs/scripts/config).
* Existing migrations are in `supabase/migrations/` and include Discord ID migration + RLS policy evolution.
* Current auth and ownership model already uses Discord-linked identity fields, which lowers auth migration risk.

Key existing assets that reduce risk:

* Discord ID strategy is already documented and validated in `docs/DISCORD_ID_MIGRATION_PLAN.md`.
* Existing DB shape and entities are documented in `docs/DATABASE_ERD.md`.

## Target Architecture

### Auth

* Auth.js (NextAuth) with Discord provider.
* Session strategy:
  * Preferred: database sessions for revocation and admin control.
  * Alternative: JWT sessions if operational simplicity is prioritized.
* Canonical identity mapping:
  * Internal user ID (UUID) for app relations.
  * Discord ID as immutable external identity.

### Data

* App-owned Postgres connection (no client-side direct DB access).
* ORM/query layer:
  * Preferred: Prisma for ecosystem maturity and migration ergonomics.
  * Alternative: Drizzle for lighter runtime and SQL-first control.
* Server-only data access from API routes/server actions.

### Runtime/Operations

* Docker Compose for local/dev stack:
  * `app` (Next.js)
  * `db` (Postgres)
  * Optional: `redis`, `PgAdmin`/`adminer`
* Structured migrations via ORM migration tooling.

## Migration Strategy (Phased)

### Phase 0: Decision + Contract (now)

Goals:

* Lock technology choices.
* Define migration contract boundaries.
* Define acceptance criteria for cutover readiness.

Deliverables:

* Architecture Decision Record (ADR) for auth/session and ORM choice.
  * `docs/adr/ADR-001-auth-session-strategy.md` (accepted)
  * `docs/adr/ADR-002-orm-and-migration-strategy.md` (accepted)
* Identity contract (`users.id`, `users.discord_id`, session claims).
* Initial domain boundaries for repository/service interfaces.

### Identity and Session Contract

Canonical identity:

* `users.id` (UUID): internal, relational primary identity used by app tables and FK links.
* `users.discord_id` (string or bigint-normalized string): immutable external identity from Discord.
* `users.discord_id` must be unique globally.

Session contract (Auth.js, DB sessions):

* Session lookup key: Auth.js session token (database-backed).
* Required server session fields:
  * `user.id` (UUID)
  * `user.discordId`
  * `user.displayName` (nullable)
* Optional derived claims (resolved server-side per request or short-lived cache):
  * `activeGroupId`
  * `groupRole` (`admin|officer|member|trial|pending`)

Authorization contract:

* Authorization decisions are server-owned and must not rely solely on client claims.
* Group role checks are resolved from authoritative DB state (`group_members`) for protected operations.
* Discord identity is used for account linking and resilience; internal UUID remains FK source of truth.

Session lifecycle:

* Session creation: after successful Discord OAuth callback and user link/upsert.
* Session revocation: supported via DB session invalidation (global or targeted).
* Role-change propagation: protected endpoints must resolve role from DB at request time or bounded cache TTL.

Data invariants:

* Every authenticated principal maps to exactly one `users.id`.
* `users.discord_id` uniqueness is enforced at DB level.
* No domain table should depend on Discord OAuth token persistence.

### Phase 1: Abstraction Seam

* Introduce app-owned interfaces for auth/data operations.
* Keep Supabase implementation behind adapters temporarily.
* Convert direct component/hook dependencies to call domain services.

### Phase 2: Parallel Backend

* Implement Discord auth via Auth.js.
* Stand up Compose Postgres and ORM models/migrations.
* Implement first server API endpoints with app-owned authorization checks.

### Phase 3: Data Migration + Validation

* Export/import schema and data to app-owned Postgres.
* Validate counts and integrity (PK/FK/unique constraints).
* Optionally dual-read/dual-write for high-risk domains.

### Phase 4: Incremental Cutover

* Migrate domain by domain (auth, permissions, characters, events, etc.).
* Move hooks/components to app endpoints.
* Monitor and validate behaviour parity.

### Phase 5: Decommission Supabase

* Remove direct client dependency and env vars.
* Remove Supabase-specific runtime flows and scripts.
* Keep archived migration history for audit/rollback documentation.

## Phase 0 Tracker (Started)

Status key: `[ ]` not started, `[~]` in progress, `[x]` complete.

* `[~]` Inventory Supabase coupling and env dependencies.
* `[x]` Choose auth/session strategy (Auth.js DB sessions vs JWT) - ADR-001 accepted.
* `[x]` Choose ORM/migration tool (Prisma vs Drizzle) - ADR-002 accepted.
* `[x]` Define identity and authorization contract.
* `[x]` Define first migration slice (auth + permissions read path).
* `[x]` Define rollback strategy and go/no-go criteria.
* `[x]` Create dated Phase 1 checklist with PR sequence (`docs/PHASE1_CHECKLIST.md`).

## Phase 0 Decision Matrix

### 1) Auth/session

Option A: Auth.js + DB sessions (recommended)

* Pros: revocation, admin control, easier incident response.
* Cons: session table management and slightly more DB load.

Option B: Auth.js + JWT sessions

* Pros: simpler infra and fewer DB writes.
* Cons: harder revocation and role update propagation.

### 2) ORM/migrations

Option A: Prisma (recommended)

* Pros: strong ecosystem, migration workflow, good type-safety for teams.
* Cons: heavier generated client and occasional migration verbosity.

Option B: Drizzle

* Pros: lightweight, SQL-first clarity.
* Cons: team familiarity and migration ergonomics vary by workflow.

## Proposed Initial Defaults (to confirm)

* Auth: Auth.js + Discord provider + DB sessions.
* DB: Postgres in Docker Compose for local/dev.
* Data layer: Prisma + server-side repository/services.
* Cutover style: incremental, domain-by-domain (no big-bang rewrite).

## Acceptance Criteria for Completing Phase 0

* Technology choices are explicitly approved.
* Identity/session contract is documented.
* First migration slice is selected and sized.
* Risk register includes top 5 migration risks and mitigations.
* A dated Phase 1 implementation checklist exists.

## Risks and Mitigations

1. Auth parity regressions

* Mitigation: preserve Discord ID mapping and create parity tests around login, membership checks, and role resolution.

1. Authorization drift without RLS

* Mitigation: centralize authorization in server services and add role-based integration tests.

1. Data migration integrity

* Mitigation: scripted verification (counts, orphan checks, unique constraints, FK checks).

1. Feature freeze pressure

* Mitigation: incremental vertical slices with short-lived branch flags.

1. Test suite churn

* Mitigation: replace Supabase chain mocks with service-level test doubles gradually.

## Suggested First Slice (Phase 1 Candidate)

* Auth/session bootstrap.
* Group permissions read endpoint.
* Current-user profile read endpoint.

Reason: this validates identity + authorization early and unlocks downstream domain migration safely.

### First Slice Definition (Locked)

Scope boundaries:

* In scope:
  * Discord login callback and app-owned session issuance.
  * Current authenticated user profile read.
  * Group permission read for current user in active group.
* Out of scope:
  * Writes to recruitment/events/builds domains.
  * Bulk data migration and dual-write.
  * Storage/bucket migration.

Proposed endpoints and handlers:

* `GET /api/auth/session`
  * Returns normalized session payload (`user.id`, `user.discordId`, display fields).
* `GET /api/me/profile`
  * Returns app profile record for authenticated user.
* `GET /api/groups/:groupId/permissions`
  * Returns resolved role + effective permissions for authenticated user in group.

Service/repository modules to introduce:

* `src/server/auth/session-service.ts`
* `src/server/users/user-profile-repository.ts`
* `src/server/permissions/group-permissions-service.ts`

Consumer cutover targets (first slice):

* `useAuth` and auth callback flow.
* Existing permissions read path used by settings/admin gating.
* Current-user profile reads in app shell and settings surfaces.

Effort sizing (engineering days):

* Auth.js bootstrap + Discord provider wiring: 1.0-1.5 days.
* Session and profile endpoint implementation: 1.0 day.
* Group permissions endpoint + role resolution parity tests: 1.0-1.5 days.
* Hook/client integration and cleanup for slice: 1.0 day.
* Total estimated first-slice effort: 4.0-5.0 days.

Test plan and parity checks:

* Unit:
  * Session normalization and identity mapping.
  * Permission resolution for each role (`admin|officer|member|trial|pending`).
* Integration:
  * Authenticated and unauthenticated access for all three endpoints.
  * Group mismatch and non-member scenarios return expected status.
* Regression/parity:
  * Compare outputs against current Supabase-backed path for a fixed fixture dataset.

Go/no-go criteria for slice cutover:

* Go:
  * All new endpoint tests pass.
  * Existing `yarn lint` and `yarn test --runInBand` pass.
  * Role/permission parity matches baseline fixtures in all supported roles.
  * No increase in auth-related error rate during staged rollout window.
* No-go:
  * Any role mismatch causing privilege escalation or unexpected denial.
  * Session invalidation/revocation does not take effect immediately.
  * Repeated 401/403 spikes after enabling slice path.

Rollback strategy for first slice:

* Keep a runtime feature flag (example: `AUTH_STACK=v1|v2`) for endpoint/router selection.
* On failure, switch reads back to Supabase-backed auth/permission path.
* Preserve new tables/sessions for diagnostics; do not run destructive rollback migrations during incident response.
* Require post-rollback incident note with failed criteria and remediation tasks before reattempt.

## Next Actions

1. Execute PR-02 from `docs/PHASE1_CHECKLIST.md` (Auth.js Discord bootstrap).
2. Implement `GET /api/auth/session` normalized response behind `AUTH_STACK=v2`.
3. Add fixture-based parity tests for permission resolution before enabling cutover.
