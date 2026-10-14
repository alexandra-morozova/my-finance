# Transactions — implementation backlog

**Status:** Phased backlog — Phases 0–2 complete per tracker; Phase 3 is next and awaits explicit user confirmation. Execute **one phase at a time**.
**Design (semantics, security, sync, performance):** [transaction-design.md](./transaction-design.md)
**Do not drift:** If code disagrees with the design doc, fix code or update the design doc first — not both silently.

---

## How to use this file

1. Read `transaction-design.md` end-to-end before coding.
2. Complete **only the current phase** checklist.
3. Stop and ask the user to confirm before starting the next phase.
4. Mark phase checkboxes when done.

---

## Phase 0 — Design lock (no code)

**Completed 2026-10-14.**

- [x] Signed decimal strings (negative outflow, positive inflow).
- [x] Transaction import idempotency: `(accountId, externalProvider, externalId)` partial unique (provider ids per account).
- [x] Soft delete via `deletedAt`; retention/audit called out in design §4.6.
- [x] Phase 1 ships **Account** before transaction HTTP routes.

**Exit criteria:** Decisions recorded; no open questions blocking migration.

---

## Phase 1 — Schema, accounts module, layer cleanup

**Completed 2026-10-14.**

### Database

- [x] Add Prisma enums: `TransactionStatus`, `TransactionKind`, `TransactionSource`, `AccountSyncStatus` (if used).
- [x] Add `Account` model: `userId`, name, currency, type; optional `externalProvider`, `externalAccountId`; sync fields (`lastSyncedAt`, `syncCursor`, `syncStatus`, `syncError`).
- [x] Add `Transaction` model per design §4–§5: amounts, dates, status, kind, source, external ids, `relatedTransactionId`, `transferGroupId`, `deletedAt`, FKs to `User` and `Account`.
- [x] Add indexes and unique constraint per design §7.2 and §5.1.
- [x] Migrations `20261014140044_accounts_and_transactions`, `20261014143000_fix_external_uniques_and_account_ownership` + `pnpm db:generate` from `backend/`.
- [x] Partial import dedup declared in `schema.prisma` (`previewFeatures = ["partialIndexes"]`, `@@unique` + `where: raw(...)`); DB diff empty vs live schema.
- [x] User/financial hard-delete policy: RESTRICT FKs (`20261014145000_user_financial_delete_restrict`), design §6.4, integration tests.

### Accounts module (minimal)

- [x] `accounts.routes.ts`, `accounts.controller.ts`, `accounts.service.ts`, `accounts.repository.ts`, `accounts.validation.ts`, `accounts.types.ts`.
- [x] `GET /accounts`, `POST /accounts` (manual account creation); all scoped by `userId`.
- [x] Register router in `app.ts`.

### Transaction module cleanup

- [x] Move Prisma list query out of `transaction.controller.ts` into `transaction.repository.ts` (keyset on `date` + `id`, excludes `deletedAt`).
- [x] Add `transaction.service.ts`, `transaction.types.ts`; controller stub for Phase 2.
- [x] Fix imports: `generated/prisma/client.ts`, `database/prisma.ts` (match `users.repository.ts`).
- [x] No HTTP transaction routes yet.

**Exit criteria:** Schema applied; accounts API works with auth; transaction listing callable from service/repository in tests or REPL; no Prisma in controller.

---

## Phase 2 — Read API + ownership tests

**Completed 2026-10-14. Phase 3 is next and must not start until the user confirms.**

- [x] `transaction.validation.ts`: query params (limit, cursor, accountId, status, from, to).
- [x] `GET /transactions` with compound cursor `(date, id)` per design §7.1.
- [x] `GET /transactions/:id`.
- [x] Service enforces account filter ownership.
- [x] Response DTO: amount string, ISO date, no internal sync secrets.
- [x] Integration tests: `tests/integration/transaction-ownership.test.ts`.
- [x] Register `transactionRouter` in `app.ts`.

**Exit criteria:** Read paths only; tests green; EXPLAIN deferred to Phase 6 at volume.

---

## Phase 3 — Manual writes (CRUD, transfer, refund)

**User confirmation required before Phase 4.**

- [ ] `POST /transactions` — `source: MANUAL`.
- [ ] `PATCH /transactions/:id` — rules per design §4.6.
- [ ] `DELETE /transactions/:id` — soft delete.
- [ ] `POST /transactions/transfer` — two rows, `$transaction`.
- [ ] `POST /transactions/:id/refund`.
- [ ] CSRF + `requireAuth` on all mutating routes.
- [ ] Tests: transfer atomicity; refund caps; cannot PATCH another user’s row.

**Exit criteria:** Manual lifecycle complete without import/sync.

---

## Phase 4 — Idempotent import (priority #1)

**User confirmation required before Phase 5.**

- [ ] `POST /transactions/import` (batch upsert).
- [ ] Resolve `externalAccountId` → `Account` for `userId`.
- [ ] Upsert on external id; map provider status/kind where applicable.
- [ ] Return counts `{ created, updated, skipped }` (exact shape in `transaction.types.ts`).
- [ ] Tests: duplicate batch, concurrent upsert, pending → posted update.

**Exit criteria:** Import idempotency proven by tests; no check-then-insert race.

---

## Phase 5 — Data security hardening

**User confirmation required before Phase 6.**

- [ ] Audit all repository methods: every query includes `userId` where applicable.
- [ ] Central `assertAccountOwned(userId, accountId)` (accounts service or shared helper used by transaction service).
- [ ] Review logs in transaction/import paths for sensitive data.
- [ ] Document public DTO fields in `transaction.types.ts` (comment or explicit mapper).

**Exit criteria:** Checklist in design §6 satisfied; no IDOR in review.

---

## Phase 6 — Query performance

**User confirmation required before Phase 7.**

- [ ] Seed script: realistic volume (document N users × M transactions in script header).
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` on primary list queries — save notes in `docs/todo-be.md` or PR description.
- [ ] Load test `GET /transactions` — record p95 and environment.
- [ ] Adjust indexes or default date window only if EXPLAIN/load test fails SLO.

**Exit criteria:** Index scan on hot paths at seeded volume; SLO documented.

---

## Phase 7 — Sync architecture (priority #4)

**User confirmation required before Phase 8.**

- [ ] Job table or minimal queue in Postgres; worker entrypoint (e.g. `backend/src/workers/sync-accounts.ts` or script).
- [ ] Worker: fetch incremental → call import service → advance `syncCursor` / `lastSyncedAt`.
- [ ] `GET /accounts/:id/sync-status`, `POST /accounts/:id/sync` (202 enqueue).
- [ ] `transaction.mapper.ts` for first provider adapter (stub/mock OK for v1).
- [ ] Tests: cursor not advanced on failure; request handlers do not call bank client (grep/architecture test optional).

**Exit criteria:** End-to-end sync path off request thread; design §8 satisfied.

---

## Phase 8 — Recurring schedules (optional / later)

**Only after Phase 7 confirmed complete.**

- [ ] `RecurringSchedule` model + link on `Transaction` if product requires native recurrence.
- [ ] Otherwise defer and document “bank metadata only” in design §4.5.

---

## Current position

| Phase | Status |
|-------|--------|
| 0 | Complete |
| 1 | Complete |
| 2 | Complete |
| 3 | **Next — awaiting user confirmation** |
| 4–8 | Not started |

---

## Agent instructions (Cursor / future sessions)

- Implement transactions only according to this backlog order.
- After finishing a phase, update the **Current position** table and phase checkboxes, then **stop and ask the user** before the next phase.
- Prefer changes in `modules/transaction/` and `modules/accounts/`; do not refactor unrelated modules.
- See also [backend/AGENTS.md](../backend/AGENTS.md) and `.cursor/rules/persistence.mdc`.
