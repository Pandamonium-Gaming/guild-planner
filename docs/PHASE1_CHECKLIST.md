# Phase 1 Checklist - Supabase Exit

Date created: 2026-05-21

## Objective

Execute Phase 1 (abstraction seam) in a non-breaking way, with a clear PR sequence, explicit owners, and measurable acceptance criteria.

## Roles

* Owner placeholders:
  * `@auth-owner`: Auth.js and session path
  * `@api-owner`: API route and service implementation
  * `@data-owner`: Repository/ORM seam and migration mapping
  * `@qa-owner`: Test parity and rollout validation

## PR Sequence

### PR-01: Feature Flag and Scaffolding

* Target window: 2026-05-22 to 2026-05-23
* Primary owner: `@api-owner`
* Scope:
  * Add runtime flag for auth stack selection (for example `AUTH_STACK=v1|v2`).
  * Add initial server folder conventions for services/repositories.
  * Add no-op wiring in app startup/middleware paths (without switching behaviour).
* Acceptance criteria:
  * App behaviour unchanged with default flag value (`v1`).
  * Lint and tests pass.

### PR-02: Auth.js Discord Bootstrap

* Target window: 2026-05-23 to 2026-05-26
* Primary owner: `@auth-owner`
* Scope:
  * Add Auth.js route handlers and Discord provider config.
  * Implement DB session setup and session helpers.
  * Add `GET /api/auth/session` normalized response shape.
* Acceptance criteria:
  * Successful login/logout in dev with Auth.js path when flag is `v2`.
  * Session revocation test path documented and validated.
  * Lint and tests pass.

### PR-03: Profile Read Path

* Target window: 2026-05-26 to 2026-05-27
* Primary owner: `@data-owner`
* Scope:
  * Introduce `session-service` and `user-profile-repository` seam.
  * Add `GET /api/me/profile` and map to current profile contract.
  * Keep Supabase-backed path available behind `v1` flag.
* Acceptance criteria:
  * Profile parity verified against baseline fixture data.
  * Authenticated and unauthenticated response behaviour matches expected status codes.

### PR-04: Group Permissions Read Path

* Target window: 2026-05-27 to 2026-05-29
* Primary owner: `@api-owner`
* Scope:
  * Introduce `group-permissions-service` seam.
  * Add `GET /api/groups/:groupId/permissions`.
  * Resolve role from authoritative membership data and compute effective permissions.
* Acceptance criteria:
  * Role parity for `admin|officer|member|trial|pending` matches baseline fixtures.
  * Non-member and group mismatch cases return expected status codes.

### PR-05: Client Hook Integration (First Slice)

* Target window: 2026-05-29 to 2026-06-02
* Primary owner: `@auth-owner`
* Secondary owner: `@qa-owner`
* Scope:
  * Update `useAuth` and relevant permission/profile read consumers to call new endpoints under `v2`.
  * Keep fallback to current path when `v1`.
* Acceptance criteria:
  * No functional regression in settings/admin gating surfaces.
  * Lint/tests pass and first-slice parity checklist is complete.

## Cross-PR Test Checklist

* Unit tests:
  * Session normalization and identity mapping.
  * Permission resolution matrix by role.
* Integration tests:
  * Authenticated/unauthenticated responses for all first-slice endpoints.
  * Group mismatch and non-member behaviour.
* Regression checks:
  * `yarn lint`
  * `yarn test --runInBand`

## Go/No-Go Gate for Enabling `AUTH_STACK=v2`

* Go when all are true:
  * First-slice endpoint tests pass.
  * Role/permission parity matches baseline fixture dataset.
  * No auth-related error spike during staged test window.
* No-go if any are true:
  * Privilege escalation or unexpected denials.
  * Session invalidation delay or failure.
  * Repeated 401/403 regression pattern after enabling `v2`.

## Rollback Procedure

* Immediate action:
  * Set runtime flag back to `AUTH_STACK=v1`.
* Follow-up actions:
  * Capture failing request traces and parity diff.
  * Open remediation issue(s) linked to failed gate criteria.
  * Do not run destructive schema rollback during incident response.

## Status Tracker

Status key: `[ ]` not started, `[~]` in progress, `[x]` complete.

* `[x]` PR-01 Feature flag and scaffolding
* `[ ]` PR-02 Auth.js Discord bootstrap
* `[ ]` PR-03 Profile read path
* `[ ]` PR-04 Group permissions read path
* `[ ]` PR-05 Client hook integration
* `[ ]` Go/no-go gate review completed
