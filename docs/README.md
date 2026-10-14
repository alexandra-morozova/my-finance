# MyFinance architecture and planning docs

This directory is the documentation entry point for backend architecture, feature design, implementation tracking, and deferred hardening. Read the status labels before treating a design as an implementation instruction.

## Current status at a glance

Status below reflects the uploaded implementation tracker as of **14 October 2026**. It has not been independently verified against a live repository or CI run.

| Area | Status | Source of truth | Next action |
|---|---|---|---|
| Accounts and transaction schema | Implemented per tracker | [Transaction design](./transaction-design.md) | Keep schema and design synchronized |
| Accounts API (`GET /accounts`, `POST /accounts`) | Implemented per tracker | [Transaction implementation backlog](./transaction-implementation.md), Phase 1 | No additional account endpoints committed for v1 |
| Transaction read API | Implemented per tracker | [Transaction design](./transaction-design.md), [backlog](./transaction-implementation.md), Phase 2 | Phase 3 awaits explicit user confirmation |
| Transaction writes, transfer, refund | Planned | [Transaction implementation backlog](./transaction-implementation.md), Phase 3 | Await confirmation before starting |
| Transaction import / bank sync | Planned | [Transaction implementation backlog](./transaction-implementation.md), Phases 4 and 7 | Import precedes sync |
| Email verification | Not implemented; previous attempt reverted | [Email verification design](./email-verification-design.md), [backlog](./email-verification-implementation.md) | Resume from the backlog; resolve delivery policy first |
| Near-term auth/backend hardening | Deferred backlog | [Backend next-version work](./for-next-version-be.md) | Prioritize and implement in small slices |
| OIDC/BFF high-availability session architecture | Proposal; not approved for current v1 | [Auth system design](./auth-sys-design.md) | Make an architecture decision before implementation |
| Backend coding conventions | Contributor guidance | [`backend/AGENTS.md`](../backend/AGENTS.md) | Follow for code changes |

## Recommended reading order

1. [Backend delivery status and notes](./todo-be.md) — current implementation snapshot.
2. [Transaction design](./transaction-design.md) — approved domain rules for accounts, transactions, import identity, ownership, pagination, and sync.
3. [Transaction implementation backlog](./transaction-implementation.md) — completed phases, current phase, and confirmation gates.
4. [Email verification design](./email-verification-design.md), then [implementation backlog](./email-verification-implementation.md) — planned verify-before-sign-in feature.
5. [Deferred backend hardening](./for-next-version-be.md) — logging, shared rate limits, audit events, refresh tokens, retention, and HSTS considerations.
6. [Resilient banking authentication design](./auth-sys-design.md) — separate future-state OIDC/BFF proposal; do not treat it as approved or combine it with the JWT refresh plan without a decision.

## Document catalogue

| Document | Purpose | Status |
|---|---|---|
| [todo-be.md](./todo-be.md) | Current backend implementation summary and deferred work | Status snapshot; reconcile with code before release |
| [transaction-design.md](./transaction-design.md) | Domain semantics, constraints, security, read performance, import and sync architecture | Approved for phased implementation |
| [transaction-implementation.md](./transaction-implementation.md) | Phase-by-phase implementation checklist | Phases 0–2 complete per tracker; Phase 3 next |
| [email-verification-design.md](./email-verification-design.md) | Product/API/security design for email ownership verification | Proposed; not implemented |
| [email-verification-implementation.md](./email-verification-implementation.md) | Concrete task checklist for resuming email verification | Not implemented; previous attempt reverted |
| [for-next-version-be.md](./for-next-version-be.md) | Deferred production hardening for the current Express/JWT stack | Backlog; prioritize before multi-instance production |
| [auth-sys-design.md](./auth-sys-design.md) | OIDC/BFF session architecture for a future banking-web target | Proposal; decision required |

## Cross-document rules

- **Implemented status comes from the implementation tracker, not from the design doc.** Before a release, verify code, migrations, and tests in the repository.
- **Transaction design is the domain source of truth.** If implementation differs, update code or explicitly amend the design; do not silently diverge.
- **The transaction backlog is phase-gated.** Complete one phase and obtain user confirmation before starting the next.
- **Email verification is not shipped.** Do not interpret its target API or acceptance criteria as current behavior.
- **Two authentication directions are documented.** `for-next-version-be.md` extends the existing password/JWT model with app-issued refresh tokens and `auth_epoch`; `auth-sys-design.md` proposes an OIDC-backed BFF with an opaque session cookie and protected provider tokens. These are not the same design. Decide whether the latter replaces or complements the former before implementing overlapping session/token work.
- **Keep secrets out of documentation and logs.** Example environment variables are names only; credentials belong in secret management.

## Decisions to resolve before the relevant work starts

1. **Authentication roadmap:** retain and harden the current password/JWT architecture, or approve a migration to OIDC/BFF sessions. Avoid building both session models in parallel without a clear boundary.
2. **Email-send failure policy:** while email is sent synchronously, choose rollback/failure behavior explicitly; when using a transactional outbox, commit the user, token, and outbox event atomically and deliver asynchronously. See §6.1 and §8.4 in the email verification design.
3. **Financial data deletion:** retain the current restrictive database relationships and design an explicit account-closure/erasure workflow with legal retention review before adding user deletion APIs.

## Scope and publication note

These are engineering and security design documents, not end-user product documentation or an independent security certification. Architecture diagrams and acceptance criteria describe targets unless a status row says otherwise. The backend agent guide is included for contributors; it is not a product feature specification.
