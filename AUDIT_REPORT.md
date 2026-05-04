# Codebase Audit Report

Date: 2026-05-04
Repository: `d:\task_tracker`
Audit scope: source files under `app/`, `components/`, `hooks/`, `lib/`, `prisma/`, `supabase/`, `types/`, root configs/scripts (excluding generated dirs like `.next/` and `node_modules/`).

## Executive Summary

The codebase is generally coherent and TypeScript compiles cleanly, but there are several production-impact issues:

1. A role-creation flow is broken between frontend and backend validation.
2. Task report submission can leave orphaned uploads and inconsistent persisted data on partial failure.
3. Selected completion date is not preserved in persisted task `createdDate`.
4. Tooling/install hygiene is incomplete (`eslint` is declared but not installed, so linting cannot run).
5. Sensitive operational patterns remain in repo (`test.js` logs DB URL, concrete Supabase URL in `.env.local.example`).

## Findings (By Severity)

## Critical

1. Broken role creation flow (`Other` + custom role always rejected)
- Frontend sends custom role text when `Other` is selected: [AdminCreateUserPage.tsx](/d:/task_tracker/components/admin/AdminCreateUserPage.tsx:41)
- Backend strictly rejects roles not in `TEAM_ROLES`: [route.ts](/d:/task_tracker/app/api/admin/users/route.ts:140)
- Impact: User creation fails for all custom roles despite UI allowing it.
- Fix: Either remove custom-role UI or allow/normalize custom roles server-side (with validation constraints and persistence policy).

2. Partial-failure flow can corrupt report attachments/task consistency
- Attachments are uploaded before final persistence: [TaskCompletionForm.tsx](/d:/task_tracker/components/taskboard/TaskCompletionForm.tsx:271)
- On task/entry failure, uploaded files for current draft are deleted: [TaskCompletionForm.tsx](/d:/task_tracker/components/taskboard/TaskCompletionForm.tsx:426)
- If task row was already persisted but a later entry fails, DB report may still reference now-deleted attachments.
- Impact: Broken attachment links, inconsistent records, hard-to-reconcile data.
- Fix: Use transactional server endpoint or two-phase flow (persist metadata after all DB writes succeed). Avoid deleting files already referenced by committed rows.

## High

1. Editing staged task can orphan previously uploaded files
- Staged task replacement logic overwrites draft by id: [TaskCompletionForm.tsx](/d:/task_tracker/components/taskboard/TaskCompletionForm.tsx:346)
- When editing and re-staging, old `attachments` are replaced but never cleaned up.
- Impact: Storage leak and dangling files.
- Fix: On draft replacement, diff old/new attachments and remove superseded uploads.

2. Selected report date is ignored for task `createdDate`
- Persisted task uses `createdDate: getTodayStr()` instead of draft date: [TaskCompletionForm.tsx](/d:/task_tracker/components/taskboard/TaskCompletionForm.tsx:411)
- Impact: Daily/weekly/monthly report filters and chronology can be wrong.
- Fix: Set `createdDate` from `draft.date`.

3. No server-side file validation/enforcement
- File type enforcement is only client-side (`accept` + MIME/extension checks), then direct storage upload from browser.
- Impact: Malicious/unexpected files can still be uploaded if client is bypassed.
- Fix: Move upload authorization/validation to server (signed upload path policy, MIME/size allowlist checks).

## Medium

1. Linting pipeline is non-functional in current environment
- Script exists: [package.json](/d:/task_tracker/package.json:9)
- `npm run lint` fails because `eslint` is not installed (`npm ls eslint` returns empty).
- Impact: Quality gate missing in CI/local checks.
- Fix: Install dev dependencies reliably (`npm ci` in CI), fail build if lint cannot run.

2. `settings` fetch errors are not handled explicitly
- Only `tasksRes.error`/`entriesRes.error` throw; `settingsRes.error` is ignored: [useAppStore.ts](/d:/task_tracker/lib/store/useAppStore.ts:166)
- Impact: Silent fallback behavior can mask RLS/migration/config regressions.
- Fix: Handle `settingsRes.error` and branch intentionally (warn + fallback or fail + banner).

3. Overbroad `select('*')` on client reads
- [useAppStore.ts](/d:/task_tracker/lib/store/useAppStore.ts:160)
- Impact: unnecessary payload coupling; schema changes can cause accidental data overfetch.
- Fix: select only required columns.

4. Debug script can leak DB connection string
- [test.js](/d:/task_tracker/test.js:4)
- Impact: accidental credential disclosure in logs.
- Fix: remove file from repo or sanitize output.

## Low

1. Hardcoded default project names in app state
- [useAppStore.ts](/d:/task_tracker/lib/store/useAppStore.ts:24)
- Impact: tenant/environment portability is reduced.
- Fix: source defaults from DB seed/config.

2. Environment example embeds a concrete Supabase project URL
- [.env.local.example](/d:/task_tracker/.env.local.example:1)
- Impact: ties sample config to one environment; can cause setup mistakes.
- Fix: replace with placeholders.

## Database-Specific Review

Positive:
- RLS is enabled on core tables and user-scoped policies exist.
- Integrity migration adds not-null/default constraints and status/priority check constraints.
- `settings` admin-only write policy is present.

Risks / Gaps:
1. Application-level write paths are mostly client-direct; consistency depends on multiple client operations rather than DB transactions.
2. No DB constraints visible for max upload payload metadata size or completion-report schema shape (JSONB is flexible but unguarded).
3. Operational migration drift handling is ad-hoc in API (fallback for missing `projects` column), indicating schema/version skew is expected in runtime.

## Backend Review

Positive:
- Admin route has explicit auth checks with both profile and claim-based admin fallback.
- Service role usage is confined to server contexts.

Risks / Gaps:
1. Role validation mismatch (critical issue above).
2. No obvious rate limiting / abuse throttling on admin user management endpoints.
3. Error semantics can blur auth vs infra failures (some DB issues map to `403` due `profileError || !isAdmin` branching).

## Frontend Review

Positive:
- Strong TypeScript typing and clean state boundaries.
- Good UX around task/report staging and upload UI.

Risks / Gaps:
1. Multi-step submission flow is not atomic.
2. Client-side-only upload validation.
3. Date handling bug (`createdDate` overwritten).
4. Heavy reliance on localStorage fallback can hide backend/RLS misconfigurations without strong user-visible diagnostics.

## Hardcoded Values Inventory (Production Readiness)

1. Status/priority enums duplicated across schema/types/validators/UI (`Not Started`, `In Progress`, `Completed`, `Low/Medium/High`).
2. Default project constants: [useAppStore.ts](/d:/task_tracker/lib/store/useAppStore.ts:24).
3. Default bucket fallback: `task-attachments` in [TaskCompletionForm.tsx](/d:/task_tracker/components/taskboard/TaskCompletionForm.tsx:33).
4. Concrete URL in `.env.local.example`: [.env.local.example](/d:/task_tracker/.env.local.example:1).

Recommendation: centralize constants (single source of truth), and load environment/tenant defaults from DB or deploy config.

## Production Readiness Checklist Status

- DB constraints and RLS: Partially ready
- Backend authorization: Mostly ready, with critical role-flow bug
- File upload security/consistency: Not ready
- Lint/type/test quality gates: Not ready (`lint` currently broken)
- Secrets/config hygiene: Needs cleanup
- Hardcoded tenant defaults: Needs cleanup

## Recommended Fix Order

1. Fix role creation mismatch (`Other` custom role flow).
2. Refactor report submission to server-side transactional workflow (task + entries + attachment metadata).
3. Correct `createdDate` persistence to use selected date.
4. Add server-side upload validation and signed-upload policy controls.
5. Restore lint pipeline reliability and enforce in CI.
6. Remove debug credential logging and normalize `.env.local.example` placeholders.
7. Reduce `select('*')` usage and improve explicit error handling for settings/profile fetches.
