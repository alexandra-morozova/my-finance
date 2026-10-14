# Design Document: Transactions, Accounts, and Bank Sync

**Status:** Approved for phased implementation — follow [transaction-implementation.md](./transaction-implementation.md)  
**Priority:** High — core product data  
**Target stack:** Express API, PostgreSQL (Prisma), React SPA (Vite)  
**Related:** [todo-be.md](./todo-be.md), [auth-sys-design.md](./auth-sys-design.md) (banking APIs off request path), `.cursor/rules/athomic-one-time-consumption.md` (idempotent imports)

---

## 1. Executive Summary

Users own **accounts** and **transactions**. The API lists and mutates transaction data stored in PostgreSQL. Bank (or file) imports are **idempotent** using a provider-scoped external transaction ID. **Every query enforces user ownership.** List endpoints never call banking APIs; synchronization runs in **background jobs** with incremental cursors.

This document is the source of truth for schema semantics, security, sync architecture, and performance expectations. Implementation must not drift from it without updating this file first.

---

## 2. Goals and Non-Goals

### 2.1 Goals (priority order)

1. **Duplicate prevention:** Transaction imports are idempotent via DB-enforced uniqueness on `(accountId, externalProvider, externalId)` (see §5.1).
2. **Data security:** `userId` always comes from auth; no IDOR; sensitive provider payloads are not exposed in public API responses.
3. **Query performance:** Indexes match list filters; keyset pagination; validate with `EXPLAIN` and load tests at realistic volumes.
4. **Sync architecture:** Banking API reads only in workers; HTTP handlers read Postgres.
5. **Financial semantics:** Explicit model for pending/posted, refunds, internal transfers, and recurring (§4).

### 2.2 Non-Goals (v1)

- Full double-entry ledger or accounting-grade chart of accounts.
- Real-time bank balance as source of truth on every page view.
- Payment initiation / money movement (read-only aggregation and manual entry first).
- DDD/CQRS/event sourcing — keep routes → controllers → services → repositories.
- Multi-currency FX conversion engine (store currency per row; conversion later).

### 2.3 Terminology

| Term | Meaning |
|------|---------|
| **External ID** | Provider’s stable identifier for one transaction line. |
| **Import / sync** | Upsert rows from a provider; not the same as manual user entry. |
| **Posted** | Transaction affects balances and reports (final or bank-confirmed). |
| **Pending** | Known but not yet final (may change amount/status). |
| **Transfer** | Movement between two user-owned accounts — modeled as two linked rows. |

---

## 3. Current System Context

- Auth: JWT in httpOnly cookie or Bearer; `requireAuth` sets `userId` on request.
- CSRF: mutating routes require `Origin === FRONTEND_URL` unless Bearer.
- Prisma client: `backend/generated/prisma`; schema in `backend/prisma/schema.prisma`.
- Feature stub: `backend/src/modules/transaction/` exists; listing logic was drafted in the wrong layer (`transaction.controller.ts` references a non-existent `Transaction` model). Phase 1 refactors into repository/service/controller per [backend/AGENTS.md](../backend/AGENTS.md).

---

## 4. Financial Semantics

### 4.1 Money

- **Storage:** PostgreSQL `Decimal(19,4)` via Prisma `Decimal`.
- **API:** Serialize `amount` as **string** (avoid JSON float drift).
- **Sign:** **Signed amount** — negative = outflow, positive = inflow (single field for sums and charts).
- **Currency:** ISO 4217 three-letter code on each transaction. v1: transaction currency must match the linked account’s currency (enforced in service).

### 4.2 Enums

**`TransactionStatus`**

| Value | Use |
|-------|-----|
| `PENDING` | Not yet final; may update on re-sync. |
| `POSTED` | Final for reporting and balance. |
| `VOID` | Cancelled / reversed in place (rare; prefer refund row when possible). |

**`TransactionKind`**

| Value | Use |
|-------|-----|
| `STANDARD` | Normal income/expense on one account. |
| `REFUND` | Links to original via `relatedTransactionId`; amount sign opposite partial/full refund. |
| `TRANSFER` | One leg of an internal transfer; paired via `transferGroupId`. |

**`TransactionSource`**

| Value | Use |
|-------|-----|
| `MANUAL` | User-created; no external ids. |
| `IMPORT` | One-off batch/file import. |
| `SYNC` | Recurring bank sync worker. |

### 4.3 Refunds

- Create a **new** row: `kind = REFUND`, `relatedTransactionId` → original, amount with opposite sign (or partial amount).
- **DB ownership:** `Transaction` has `@@unique([id, userId])`; refund link uses composite FK `(relatedTransactionId, userId) → (id, userId)` so a refund cannot point at another user’s transaction. `onDelete: Restrict` on that FK (required `userId` makes `SetNull` invalid for the composite).
- **Application rules (Phase 3):** validate the original is an appropriate refund target (`POSTED`, same account, not already fully refunded); prevent invalid refund chains in the service layer — the DB only enforces same-user linkage.
- Service rules: original must be owned, `POSTED`, same account (unless product later allows cross-account refunds).
- Re-import from bank: if provider marks refund type, map to `REFUND` and set external ids for idempotency.

### 4.4 Transfers between accounts

- **Never** a single row with two account IDs for v1.
- One API operation creates **two rows** in one DB transaction:
  - Same `userId`, `transferGroupId` (UUID), `kind = TRANSFER`, `source = MANUAL` (or `SYNC` if provider supports paired legs).
  - Source account: negative amount; destination: positive amount; same `date` (and currency per account).
- Deleting/editing: service updates or voids **both** legs consistently.

### 4.5 Recurring schedules

- **v1:** Optional `RecurringSchedule` is **deferred** unless needed before bank sync (Phase 7). Imported recurring lines from banks are `STANDARD` rows with provider metadata until native schedules exist.
- **Later:** `RecurringSchedule` + `recurringScheduleId` on generated instances for app-native recurrence.

### 4.6 Soft delete and retention

- **`deletedAt`:** Normal reads exclude soft-deleted rows; restore or hard-delete are explicit operations (Phase 3+).
- Soft delete hides records from the user UI; it is **not** a complete audit trail. Legal/reconciliation retention may require separate immutable audit logging later ([for-next-version-be.md](./for-next-version-be.md)).

### 4.7 Manual vs synced edits

- **MANUAL** rows: user may edit memo, category (when added), amount, date within validation rules.
- **SYNC / IMPORT** rows: user may edit **user-facing fields only** (e.g. memo, category); amount/date/status update via **re-import upsert**, not arbitrary PATCH (prevents drift from bank truth). (§4.7)

---

## 5. Idempotency and Imports

### 5.1 Unique constraint (decision)

**v1 — transactions:** Account-scoped import idempotency (provider ids unique **within a linked account**). Declared in `schema.prisma` with preview feature `partialIndexes`:

```prisma
@@unique(
  [accountId, externalProvider, externalId],
  map: "transactions_account_external_id_key",
  where: raw("external_provider IS NOT NULL AND external_id IS NOT NULL")
)
```

If a provider instead guarantees ids globally per user or per provider, revisit scope before Phase 4 import work.

Manual rows: leave `externalProvider` and `externalId` null — excluded from the partial index.

**v1 — accounts:** User-scoped partial unique on `(userId, externalProvider, externalAccountId)` with `map: "accounts_user_external_account_key"`.

**Currency:** `currency` columns use `@db.VarChar(3)`; ISO 4217 validation in application code (`parseCurrencyCode`).

Phase 4 upserts use `upsert` with `accountId_externalProvider_externalId` when all external fields are set.

**Account ownership:** `Transaction` references `Account` with composite FK `(account_id, user_id) → accounts(id, user_id)` so a row cannot attach Alice’s `userId` to Bob’s account.

### 5.2 Upsert behavior

- Import/sync maps provider DTO → upsert input.
- On conflict: update `status`, `amount`, `date`, and provider-mapped fields when the bank sends corrections (e.g. pending → posted).
- Do not rely on check-then-insert in application code; the unique constraint is authoritative (see atomic idempotency guidance in `.cursor/rules/athomic-one-time-consumption.md`).

### 5.3 HTTP idempotency (optional v1.1)

- Mutating endpoints may accept `Idempotency-Key` for manual create and bulk import; store outcome and replay same response. Not required for Phase 4 MVP if DB upsert alone satisfies imports.

### 5.4 Account resolution on import

- Each imported line references provider **account** external id → resolve to `Account` where `userId` + `externalProvider` + `externalAccountId` match.
- Unresolved account: fail batch item or quarantine table (implementation choice in Phase 4 — document in implementation backlog).

---

## 6. Data Security

### 6.1 Authorization

- **Never** accept `userId` from client body or query for authorization decisions.
- Every repository method that loads or mutates a transaction accepts **`userId` from auth** and includes it in `where`.
- `GET /transactions/:id`: `findFirst({ where: { id, userId } })` — not `findUnique({ id })` alone.
- Any `accountId` filter or write: verify account belongs to `userId` (service + repository join or dedicated `assertAccountOwned`).

### 6.2 Response shaping

- Public DTO allowlist: no raw provider JSON, sync tokens, or internal error stacks.
- Logs: no full account numbers, card numbers, or access tokens; avoid logging full amounts at info level in production.

### 6.3 Future alignment

- [auth-sys-design.md](./auth-sys-design.md) step-up auth for sensitive banking operations — hook in service layer later; not required for read/list v1.

### 6.4 User deletion and financial retention (policy)

**Do not** hard-delete a user and their financial history via an accidental `DELETE` or ORM cascade. Closure and erasure are deliberate product/legal workflows ([for-next-version-be.md](./for-next-version-be.md)).

#### Current database behavior (after `20261014145000_user_financial_delete_restrict`)

| Relation | `onDelete` | Effect |
|----------|------------|--------|
| `EmailVerificationToken` → `User` | **Cascade** | Ephemeral tokens removed with user (no financial data). |
| `Account` → `User` | **Restrict** | User cannot be hard-deleted while any account exists. |
| `Transaction` → `User` | **Restrict** | User cannot be hard-deleted while any transaction row exists. |
| `Transaction` → `Account` | **Restrict** | Account cannot be hard-deleted while transactions reference it. |
| Refund link → original `Transaction` | **Restrict** | Original cannot be hard-deleted while refunds reference it. |

A bare `prisma.user.delete()` on a user with accounts or transactions **fails at the database**. There is no API route for user deletion in v1.

#### Application rules (v1)

- **No** `deleteUser` (or equivalent) in repositories/services until a approved workflow exists.
- **Account closure:** hide or mark accounts inactive in product terms; use soft-deleted transactions (`deletedAt`) for user-hidden rows — not `DELETE FROM accounts`.
- **User deletion requests (GDPR / right to erasure):** future workflow — export, retention check, anonymize or purge per legal counsel; may require admin job, not cascade.

#### Integration tests

`backend/tests/integration/user-deletion-policy.test.ts` asserts restrict behavior against a real Postgres (same as migrations). Run with `pnpm test` after `pnpm db:deploy`.

---

## 7. Query Performance

### 7.1 Pagination

- **Keyset (cursor)** pagination only; no offset for large lists.
- Sort: `(date DESC, id DESC)`.
- **Compound cursor:** encode `(date, id)` in `nextCursor` — cursor on `id` alone is **incorrect** when ordering by date + id.

### 7.2 Indexes (minimum)

| Index | Purpose |
|-------|---------|
| `(userId, date DESC, id DESC) WHERE deleted_at IS NULL` | Default active transaction feed (`transactions_active_user_date_idx`) |
| `(userId, accountId, date DESC, id DESC)` | Per-account feed |
| `(accountId, status)` | Pending views |
| Unique `(accountId, externalProvider, externalId)` partial | Import idempotency per account |

### 7.3 Validation before production sync

- `EXPLAIN (ANALYZE, BUFFERS)` on list queries at seeded volume (target: 50k–500k rows total DB, mixed users).
- Load test `GET /transactions` (define SLO e.g. p95 &lt; 200ms on dev hardware) with k6/autocannon.
- List endpoint: cap `limit` at 100; consider default max date window (e.g. 90 days) if scans appear without filter.

---

## 8. Sync Architecture

### 8.1 Request path vs sync path

```text
SPA  --GET /transactions-->  API  -->  PostgreSQL only

Scheduler/cron  -->  Sync worker  -->  Banking API
                      |
                      v
              transaction import (upsert)  -->  PostgreSQL
```

- No banking HTTP calls from `GET /transactions` or other user-facing list/detail handlers.

### 8.2 Account sync state

On `Account` (Phase 1):

- `lastSyncedAt`, `syncCursor` (opaque provider string), `syncStatus` (`IDLE` | `RUNNING` | `ERROR`), `syncError` (internal, not public).

Optional: `sync_runs` table for audit (startedAt, finishedAt, rowsUpserted, error).

### 8.3 Worker behavior

1. Select accounts due for sync (interval or webhook enqueue).
2. Fetch incremental data using stored cursor.
3. Map to import DTO; upsert in chunks.
4. Commit cursor advance only after successful chunk commit.
5. Backoff on errors; user reads still served from DB.

### 8.4 User-facing sync API (Phase 7)

- `GET /accounts/:id/sync-status` — last success, stale flag, no secrets.
- `POST /accounts/:id/sync` — enqueue job, **202 Accepted** (no inline bank fetch).

### 8.5 Infrastructure evolution

- **v1 worker:** Postgres-backed job table + single Node worker process (fits current stack).
- **Later:** Redis/BullMQ when multiple workers needed ([for-next-version-be.md](./for-next-version-be.md)).

---

## 9. HTTP API (target)

All routes under `requireAuth` unless noted.

| Method | Path | Phase | Notes |
|--------|------|-------|-------|
| `GET` | `/transactions` | 2 | Cursor, limit, filters: accountId, status, from, to |
| `GET` | `/transactions/:id` | 2 | 404 if not owned |
| `POST` | `/transactions` | 3 | Manual create |
| `PATCH` | `/transactions/:id` | 3 | Manual + limited fields on synced |
| `DELETE` | `/transactions/:id` | 3 | Soft delete (`deletedAt`); user-hidden, not a full audit trail |
| `POST` | `/transactions/transfer` | 3 | Two-row atomic transfer |
| `POST` | `/transactions/:id/refund` | 3 | Refund row |
| `POST` | `/transactions/import` | 4 | Bulk idempotent upsert |
| `GET` | `/accounts` | 1 | List accounts |
| `POST` | `/accounts` | 1 | Manual account (optional v1) |
| `GET` | `/accounts/:id/sync-status` | 7 | Sync metadata |
| `POST` | `/accounts/:id/sync` | 7 | Enqueue sync |

Exact validation schemas live in module `*.validation.ts`; shapes must match this contract.

---

## 10. Layer Boundaries

Follow [backend/AGENTS.md](../backend/AGENTS.md):

- **Routes:** HTTP, middleware, no business logic.
- **Controllers:** Request/response only; call services.
- **Services:** Ownership rules, transfer/refund orchestration, import mapping orchestration.
- **Repositories:** Prisma only; always thread `userId` into queries.

Suggested module layout:

```text
modules/accounts/   (Phase 1)
modules/transaction/
  transaction.routes.ts
  transaction.controller.ts
  transaction.service.ts
  transaction.repository.ts
  transaction.validation.ts
  transaction.types.ts
  transaction.mapper.ts   (Phase 7 — provider → upsert DTO)
```

---

## 11. Testing Expectations

- **Ownership:** User A cannot read/update/delete user B’s transactions or accounts.
- **Idempotency:** Duplicate import batches and concurrent imports yield one row per external id.
- **Transfer:** Two legs created atomically; partial failure rolls back.
- **Pagination:** Stable pages when many rows share the same `date`.
- **Sync:** Failed sync does not advance cursor; successful sync upserts pending → posted.

---

## 12. Change Control

- Implementation phases and checkboxes: [transaction-implementation.md](./transaction-implementation.md).
- Do not skip phases or merge scope (e.g. sync before import idempotency tests pass) without explicit product decision recorded here.
- Schema or API breaking changes: update this design doc and add a migration note in the implementation backlog.
