# Backend delivery status and notes

**Status snapshot:** 14 October 2026, based on the implementation notes supplied with this documentation set. Reconcile against the live repository, migrations, and CI before using this as release evidence.

## Implemented per the current notes

### Platform and backend structure

- Switched from npm to pnpm.
- Removed the empty backend stub; the Express API lives in `backend/`.
- TypeScript runs on Node.js (`src/index.ts`); no Next.js backend.
- Environment variables are parsed in `env.config.ts`, using Node's `--env-file` / `--env-file-if-exists` support.
- `HTTP_STATUS` constants live in the shared HTTP config.
- CORS is restricted to `FRONTEND_URL` with credentials; JSON body parsing is enabled (no URL-encoded parser).
- `GET /health` exists.
- Scripts include `pnpm dev`, `pnpm start`, `pnpm typecheck`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:deploy`, and `pnpm db:studio`.
- `BASE_URL` is the API origin; `FRONTEND_URL` is the frontend/CORS origin.
- Centralized error handling and 404 handling use `AppError` and specific unauthorized/not-found/internal-server error types.
- Express 5 is used; a generic Express 4 `asyncHandler` wrapper is not required for normal promise rejection forwarding.
- PostgreSQL 17 + Prisma 7 replaced Mongo/Mongoose; the development PostgreSQL port is documented as 5433. Database connectivity is checked before the server listens.
- Prisma client output is `backend/generated/` (gitignored); schema and migrations live under `backend/prisma/`.
- Feature modules use `src/modules/<name>/` with routes, controller, service, repository, validation, and types; `app.ts` configures Express and `server.ts` handles startup.
- Shared utilities include errors, logger, bcrypt, JWT (`jose`), environment config, and field parsers (`parseEmail`, `parsePassword`, `parseName`).

### Authentication currently documented

- `POST /auth/login` sets an `httpOnly` `access_token` cookie (`Secure` in production, `SameSite=Lax`); JSON returns `{ user }` only. `requireAuth` accepts cookie or Bearer tokens.
- CSRF policy: mutating requests, including login/register without an existing cookie, require `Origin === FRONTEND_URL` unless Bearer; CORS is limited to `FRONTEND_URL`.
- `GET /users/me` is protected by `requireAuth` and returns the user identified by the token subject.
- `POST /auth/register` uses a generic `201` response to reduce email enumeration; unique-email races map to `EmailTakenError` in the repository.
- Password hashing uses bcrypt with 12 rounds; password validation is documented as minimum 12 / maximum 72 characters; login performs a dummy bcrypt comparison when email is unknown.
- Login rate limit is 10 attempts / 15 minutes and register rate limit is 5 / hour, keyed by IP + email, using the in-memory `express-rate-limit` store.
- Production HTTPS middleware and HSTS are enabled; documented HSTS max age is 180 days and `trust proxy` is set to 1. `/health` remains open.
- Cursor rules cover application structure, Express API/HTTP, persistence, and testing.

### Accounts and transactions

The [transaction implementation backlog](./transaction-implementation.md) marks Phases 0, 1, and 2 complete:

- Account and transaction Prisma models and enums are in the schema; migrations and code generation are recorded as complete in the tracker.
- User/financial hard deletion is restricted by foreign keys; a user-deletion policy integration test is recorded.
- `GET /accounts` and `POST /accounts` provide authenticated account listing and manual account creation.
- `GET /transactions` and `GET /transactions/:id` are user-scoped read APIs. The documented design uses keyset pagination on `(date, id)`, excludes soft-deleted transactions, and returns API DTOs with decimal-string amounts.

See [transaction-design.md](./transaction-design.md) for domain rules and [transaction-implementation.md](./transaction-implementation.md) for the phase checklist.

## Not implemented / not yet confirmed

### Email verification

Email verification is **not implemented**; the previous attempt was reverted. The intended behavior is verify-before-sign-in, but the design/backlog are plans, not current API behavior. Start with [email-verification-design.md](./email-verification-design.md) and [email-verification-implementation.md](./email-verification-implementation.md).

### Transaction roadmap

- Phase 3: manual transaction create/update/soft-delete, atomic two-row transfers, and refund operations.
- Phase 4: idempotent batch import.
- Phase 5: security review across transaction/import paths.
- Phase 6: realistic-volume query plans and load tests.
- Phase 7: background sync worker and sync-status/enqueue endpoints.
- Phase 8: optional native recurring schedules.

The tracker says Phase 3 is next and awaits explicit user confirmation.

### Deferred backend hardening

Shared Redis-backed rate limits, structured request/error logging and Coralogix delivery, login audit events, app-issued refresh-token rotation/revocation with `auth_epoch`, and HSTS preload evaluation are captured in [for-next-version-be.md](./for-next-version-be.md). These are backlog items unless independently verified as implemented.

The OIDC/BFF high-availability design in [auth-sys-design.md](./auth-sys-design.md) is a separate proposal that requires an architecture decision; it is not the current authentication implementation.
