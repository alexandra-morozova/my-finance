# Email verification — implementation backlog

**Status:** Not implemented; previous attempt reverted. This is the implementation checklist to use when work resumes.
**Design (API, security, flows):** [email-verification-design.md](./email-verification-design.md)
**Production scale (outbox, rate limits):** design doc §8.4 + [for-next-version-be.md](./for-next-version-be.md)

---

## Goal

Verify-before-sign-in: new users must confirm email ownership before `POST /auth/login` sets a session cookie.

---

## Prerequisites

- [ ] Read `email-verification-design.md` end-to-end.
- [ ] Local Postgres available (`pnpm db:migrate` from `backend/`).
- [ ] Decide delivery policy before coding: synchronous send with explicit compensation, or transactional outbox. Prefer outbox for resilient delivery; follow design §8.4 if selected.

---

## Step 1 — Database

- [ ] Add `users.email_verified_at` (nullable timestamptz).
- [ ] Add table `email_verification_tokens` (`user_id`, `token_hash` unique, `expires_at`, `used_at`, `created_at`, FK cascade).
- [ ] Migration: backfill existing users with `email_verified_at = created_at` so dev accounts are not locked out.
- [ ] `pnpm db:generate` / apply migration.

**If DB already had verification tables from a prior attempt:** drop `email_verification_tokens`, remove `email_verified_at` from `users`, or reset DB to match `init` migration only, then re-apply the new migration.

---

## Step 2 — Token crypto + auth repository

- [ ] `shared/utils/sha256.ts`: `randomBase64Url`, `sha256Hex` (no separate “token entity” module).
- [ ] `modules/auth/auth.errors.ts`: `InvalidOrConsumedVerificationTokenError`, `EmailNotVerifiedError`, `EmailSendFailedError`, `EmailDeliveryError`.
- [ ] `modules/auth/auth.repository.ts`:
  - insert / delete unused tokens for user
  - `replaceEmailVerificationTokenForUser` (transaction)
  - `claimEmailVerificationTokenAndVerifyUser` — atomic `updateMany` on token, then set `emailVerifiedAt` (see `.cursor/rules/athomic-one-time-consumption.md`).

**Do not** put verification token columns on `users` (keep two-table model).

---

## Step 3 — Mail (auth module only)

- [ ] `modules/auth/send-verification-email.ts`: build `{FRONTEND_URL}/verify-email?token=…`, `emailVerificationExpiresAt`, send via console (dev) or Resend HTTP API (prod).
- [ ] `shared/env.ts` + `.env.example`: `EMAIL_PROVIDER` (`console` | `resend`), `EMAIL_FROM`, `EMAIL_VERIFICATION_TTL_HOURS`, `RESEND_API_KEY` when using Resend.
- [ ] No `shared/mail/` — mail stays under `modules/auth/` until a second feature needs it.

---

## Step 4 — Auth services

- [ ] `registerUser` returns `{ outcome: "created", user } | { outcome: "unchanged" }` (keep anti-enumeration).
- [ ] `registerWithEmailVerification`: mint token, replace row, send mail.
- [ ] `verifyEmailByToken`: hash raw token, claim in repository.
- [ ] `resendVerificationEmail`: generic no-op unless user exists and unverified.
- [ ] `loginUser`: after password OK, if `emailVerifiedAt` is null → `403` + code `EMAIL_NOT_VERIFIED`.
- [ ] `users.repository`: `emailVerifiedAt` on credential lookup; `findUserEmailVerificationByEmail` for resend.

---

## Step 5 — HTTP

- [ ] `POST /auth/verify-email` `{ token }` + validation.
- [ ] `POST /auth/resend-verification` `{ email }` + rate limit (e.g. 3/hour per IP+email).
- [ ] Update register/login controller messages (register stays enumeration-safe).
- [ ] `AppError` optional `code` + error handler JSON field for SPA.

---

## Step 6 — Frontend

- [ ] Routes: `/verify-email` (public, not `GuestRoute`).
- [ ] `VerifyEmailPage`: read `token` query → `POST /auth/verify-email` → login with notice.
- [ ] `LoginPage`: handle `403` + `EMAIL_NOT_VERIFIED`, resend button.
- [ ] `services/auth.ts`, `paths.ts`, `api.ts` (`ApiError.code`), `api-parse` for message responses.
- [ ] Register → login notice copy aligned with backend register message.

---

## Step 7 — Tests

- [ ] Backend: Vitest (or chosen runner) — `auth.service` (mocked deps), `auth.repository` claim (mocked Prisma), `sha256` helpers.
- [ ] Frontend: `api` error `code`, `parseAuthMessageResponse`, navigation for `/verify-email`.

Optional later: Supertest + test database integration path.

---

## Step 8 — Hardening (post-MVP)

Deferred hardening from design §8.4 and core review notes; these items are not currently implemented unless the live repository proves otherwise:

- [ ] `requireAuth`: load user, reject if `emailVerifiedAt` null (with future `auth_epoch`).
- [ ] Resend `fetch` timeout; optional rate limit on verify POST.
- [ ] Document login **401 vs 403** tradeoff (account + password known vs unverified).
- [ ] Postgres email outbox + worker; shared Redis rate-limit store for multi-instance API.

---

## Review findings to resolve when implementing

| Topic | Action |
|--------|--------|
| Login enumeration (403 after correct password) | Product choice: keep for resend UX or unify 401 |
| Register not one transaction with send | Accept + resend, or outbox (§8.4) |
| Token in URL / console logs | Resend in prod; avoid logging raw tokens |
| React Strict Mode double verify in dev | Optional idempotent UX |

---

## Suggested commit order

1. Schema + migration only
2. Repository + errors + sha256
3. Mail + env
4. Services + routes
5. Frontend
6. Tests

Confirm with stakeholder after each step if using phased delivery.
