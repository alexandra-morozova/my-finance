# Deferred backend hardening and next-version plan

**Status:** Backlog — proposed work, not a claim of implementation. The current-state notes below come from the supplied backend status snapshot and should be rechecked against the live repository before execution.

This file tracks improvements to the **existing Express 5 + password/JWT authentication stack**. It is distinct from [auth-sys-design.md](./auth-sys-design.md), which proposes an OIDC/BFF session architecture. The latter uses an opaque browser session and recoverable, encrypted provider refresh tokens; this file proposes app-issued opaque refresh tokens whose hashes are stored. These designs must not be blended. Resolve the authentication roadmap before implementing overlapping session/token changes.

## Suggested priority order

1. Shared rate-limit storage and structured error logging/request IDs.
2. Authentication audit events and explicit revocation/refresh semantics.
3. User closure and financial-data retention workflow (legal/product decision required).
4. HSTS preload evaluation only after domain readiness is verified.

---

## 1. Error handler, structured logging, and Coralogix

**Current state in notes:** Unexpected errors go to `console.error`; `AppError` instances are not logged consistently. There are no structured fields for Coralogix, and 5xx `AppError` cases may be invisible.

**Proposed work**
- Replace ad-hoc error logging with a structured JSON logger (e.g. Pino) and ship logs using an agreed mechanism (OpenTelemetry, a supported Pino transport, or a log shipper).
- Log each handled error with timestamp, level, status, safe message, stack where appropriate, method, path, and `requestId`.
- Severity: 4xx `AppError` → `warn` (or `info` for routine 404s); 5xx and unknown → `error`.
- Keep production HTTP responses safe; logging must not reveal stack traces or secrets to clients.
- Add validated environment configuration for `CORALOGIX_PRIVATE_KEY`, `CORALOGIX_APP_NAME`, `CORALOGIX_SUBSYSTEM`, and only add `CORALOGIX_DOMAIN` if needed by the chosen endpoint.
- Add request-ID middleware so logs for one request can be correlated.
- Never log passwords, cookies, access/refresh tokens, raw verification tokens, or full verification URLs. Treat emails as PII according to the application's logging policy.

Do not skip logging merely because an error is an expected `AppError`; choose severity based on the error class and status.

---

## 2. Shared rate-limit store for multiple API instances

**Current state in notes:** `express-rate-limit` uses the default in-memory store in `backend/src/middleware/rate-limit.ts`. Counters are local to a Node process and therefore are not shared across instances.

**Proposed work**
- Use Redis (`rate-limit-redis`) or an equivalent shared store so login/register limits apply across all API instances; include resend-verification when that feature is implemented.
- Keep the documented windows and keys (IP + email), with appropriate PII protection.
- Explicitly choose fail-open or fail-closed behavior if the shared store is unavailable.

Do not add a permanent account/email lockout without a safe recovery path: that can let an attacker lock a victim out. If more abuse controls become necessary, evaluate progressive delay or CAPTCHA separately from shared counters.

---

## 3. Login audit events

**Current state in notes:** Login success and failure are not recorded as audit events. The general error logger is not a substitute for an authentication audit trail.

**Proposed work**
- Log success with timestamp, request ID, user ID, and IP; do not log passwords or tokens.
- Log failure with timestamp, request ID, IP, and a generic internal reason. Unknown email and incorrect password must remain indistinguishable in the HTTP response.
- Do not log raw email in production if treated as PII; redact or use a keyed/pseudonymous representation according to policy.
- Registration-attempt audit is out of scope unless separately approved.

Use the structured logging pipeline above rather than creating a second logging stack.

---

## 4. App-issued access/refresh token revocation

**Scope:** This plan extends the current password-based JWT design. It is not the provider-token vault design in [auth-sys-design.md](./auth-sys-design.md).

**Current state in notes:** Login sets an `httpOnly` access-token cookie and Bearer tokens are accepted. No logout or refresh route exists in the documented baseline. A copied access JWT stays usable until expiry; clearing a cookie does not revoke a copied token. `requireAuth` does not yet check the user record or whether credentials changed. The documented access TTL example is one hour; refresh-related env variables are unused.

**Target design**

- Access JWT lifetime: 15 minutes rather than one hour.
- Claims: `sub`, `ver`, `iss`, `aud`, `iat`, `exp`, and `jti`; no password or unnecessary PII. `jti` is for correlation, not a primary denylist.
- Access cookie: existing `httpOnly`, `Secure` in production, `SameSite=Lax` cookie named `access_token`.
- App-issued refresh token: high-entropy opaque secret, seven-day lifetime, **store SHA-256 hash only**; never return it in JSON or place it in web storage or logs.
- Refresh cookie: `httpOnly`, `Secure` in production, `SameSite=Lax`, path `/auth`, named `refresh_token`.
- Add `users.auth_epoch` (integer default `0`) and compare it with JWT claim `ver` during `requireAuth`.
- Add a `refresh_tokens` table with at least `id`, `userId`, unique `tokenHash`, `familyId`, `expiresAt`, `revokedAt`, and `replacedById`.

**Login**
- Create a refresh-token family, persist the hash, and set both cookies.
- Do not bump `auth_epoch` or revoke other devices' refresh families on an ordinary login.
- A copied older access JWT remains valid until its expiry unless an epoch change invalidates it.

**`POST /auth/refresh`** (with the existing cookie-CSRF rules)
1. Hash the presented token and load its row.
2. Missing, expired, or revoked token → `401` and clear cookies.
3. If `replacedById` is already set, treat this as possible token reuse and revoke the entire family.
4. Otherwise, rotate atomically: revoke the old row, insert the replacement hash in the same family, and issue an access JWT with the current `auth_epoch`.

**`POST /auth/logout`**
- Revoke the current refresh-token family and clear both cookies. Other devices remain active.
- The access JWT may remain valid until its expiry (at most 15 minutes in the target design). Do not bump `auth_epoch` for single-device logout.

**Password change, account disable, or logout-all**
- Increment `auth_epoch` and revoke all refresh-token rows for the user.
- Existing access JWTs fail on their next `requireAuth` user/version check.

**`requireAuth` target**
1. Read cookie or Bearer credential.
2. Verify JWT signature, expiry, issuer, audience, and permitted algorithm.
3. Load the user by `sub`; reject if absent or JWT `ver !== user.auth_epoch`. If email verification is implemented, also enforce the documented verified-email requirement.
4. Do not query the `refresh_tokens` table on every ordinary API request.

Do not use a Redis access-JWT `jti` denylist as the main revocation mechanism; it adds operational state and overlaps with short access TTL plus `auth_epoch`. Revisit only if the remaining access-token exposure window is unacceptable.

---

## 5. User deletion and financial retention

**Current database behavior recorded in the transaction design:** foreign keys restrict hard deletion of users with accounts or transactions; email verification tokens cascade with user deletion. There is no user-delete API in v1. See [transaction-design.md](./transaction-design.md) §6.4.

**Deferred workflow — product and legal review required**
- Distinguish account closure/deactivation (including stopping sync) from erasure.
- Decide whether a data export is required before closure/deletion.
- Apply retention holds for tax, disputes, or regulatory needs; decide when PII can be anonymized or purged.
- Use an audited admin/batch workflow if needed. Do not switch financial foreign keys to `ON DELETE CASCADE` as a shortcut.

---

## 6. HSTS preload evaluation

**Current state in notes:** Production sends `Strict-Transport-Security: max-age=15552000; includeSubDomains` (180 days); `preload` is not configured in the application.

**Only proceed after validating the deployment domain and every relevant subdomain**
- Increase `max-age` to at least `31536000` (one year) if appropriate.
- Add `preload` to the HSTS header only when the apex domain and every covered subdomain can remain HTTPS-only.
- Verify current eligibility requirements and operational consequences before submitting at [hstspreload.org](https://hstspreload.org/).
- Do not preload staging or hosts that still need HTTP; removal can take time to propagate.
