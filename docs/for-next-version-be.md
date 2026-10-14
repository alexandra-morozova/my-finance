Error handler + Coralogix

Current: unexpected errors go to console.error; AppError is not logged at all.
That will not work well in Coralogix (no structured fields, 5xx from AppError are invisible).

Changes
- Replace console.error with a JSON logger (pino) and ship logs to Coralogix
  (pino-coralogix, OpenTelemetry, or Coralogix Fluent Bit / log shipper).
- Log every error in the handler with: timestamp, level, status, message, stack,
  method, path, requestId. Coralogix needs JSON lines, not Error dumps.
- Severity: AppError with 4xx → warn (or info for 404). 5xx and unknown → error.
- Keep the HTTP response as-is (hide message/stack in production). Logging is separate.
- Add env: CORALOGIX_PRIVATE_KEY, CORALOGIX_APP_NAME, CORALOGIX_SUBSYSTEM
  (and maybe CORALOGIX_DOMAIN). Do not commit secrets.
- Add request-id middleware so Coralogix can group one request’s logs.

Do not treat AppError as “skip logging”. Treat it as “expected, still record it”.

---

Rate limit store (multi-instance)

Current: `express-rate-limit` uses the default in-memory store in
`backend/src/middleware/rate-limit.ts`. Counters live in one Node process.

That does not work with more than one API instance (each process has its own
counts; an attacker can spread attempts across instances).

Changes
- Use a shared store (Redis via `rate-limit-redis`, or equivalent) so login and
  register limits apply across all instances.
- Keep the same windows and keys (IP + email).
- Do not log emails or tokens from the store.
- Fail closed or fail open should be an explicit decision when the store is down.

No account lockout. Login is only 10 tries / 15 min per IP+email (in memory).
There is no freeze of the email/account itself, no captcha, no backoff that
survives process restart. A guesser can rotate IPs and stay under the cap.
Do not add “lock this email after N failures” without an unlock path: an
attacker can use it to lock a victim out (account-lock DoS). If lockout is
added later, it is separate from the Redis shared counter; prefer
progressive delay or captcha over freezing the account.

---

Login audit log

Current: login success and failure are not recorded. Failed login is a 401
AppError (error handler does not log AppError). Success is silent. Coralogix
in the section above is the error-handler/shipper work, not an auth audit
trail.

Changes (with the JSON logger / Coralogix work, not a second logging stack)
- Log login success: timestamp, requestId, user id, IP. Do not log the
  password or the token.
- Log login failure: timestamp, requestId, IP, generic reason
  (unknown email vs bad password must stay indistinguishable in the HTTP
  response; the log may use an internal code). Do not log the password.
- Do not log the raw email in production if that is treated as PII; hash or
  redact if required.
- Register attempts are out of scope until product wants them.

---

Token revocation (access + refresh)

Current: login sets an httpOnly access-token cookie (Bearer still accepted).
There is no logout route. A pasted `Authorization: Bearer` JWT still works
until `exp`. The JWT is verified for signature, exp, iss, aud, alg. There is
no refresh token, and `requireAuth` does not check that the user still exists
or that credentials changed. Access TTL is `JWT_EXPIRES_IN` (example 1h).
`JWT_REFRESH_SECRET` and `JWT_REFRESH_EXPIRES_IN` are unused.

New login does not kill the previous JWT. This browser gets a new cookie;
a copied old token (Bearer paste, another tab/client) still works until
`exp`. That stays true after refresh/epoch ships: login overwrites the
cookie and starts a new refresh family, but it must not bump
`users.auth_epoch` (that would log out every device). The copy dies when
`exp` hits, or when epoch is bumped (password change / disable /
logout-all).

Do not try to delete access JWTs. They stay valid until `exp` unless every
request hits the server. Clearing the cookie does not revoke a copied token.
Revoke by: short access lifetime + stored refresh tokens you can delete +
`users.auth_epoch` vs JWT claim `ver` for “kill this user’s access tokens.”

Do not use a Redis denylist of access `jti`s as the main mechanism (needs
Redis you do not have yet; duplicates refresh + epoch). Optional later if a
15-minute theft window is still too long.

Access JWT
- Lifetime: 15 minutes (not 1h).
- Claims: `sub`, `ver`, `iss`, `aud`, `iat`, `exp`, `jti` (id for logs, not a
  denylist). Still no password or PII.
- Cookie: existing httpOnly / Secure / SameSite=Lax `access_token`.

Refresh token
- Lifetime: 7 days (`JWT_REFRESH_EXPIRES_IN`).
- Opaque secret, not a JWT verified without the DB. Store **sha256 hash
  only**.
- Second httpOnly cookie `refresh_token`, `path=/auth`, Secure, SameSite=Lax.
- Never put refresh tokens in JSON or localStorage. Do not log tokens.

Postgres
- `users.auth_epoch` Int default 0. Bump on password change, disable
  account, “log out everywhere.” Access JWT `ver` must match.
- `refresh_tokens`: `id`, `userId`, `tokenHash` (unique), `familyId`,
  `expiresAt`, `revokedAt` (nullable), `replacedById` (nullable).

Login
- Create a refresh family, store hash, set both cookies. JSON stays `{ user }`.
- Do not bump `auth_epoch`. Do not revoke other devices' refresh families.
- A copied previous access JWT remains valid until `exp`.

POST /auth/refresh (cookie CSRF rules apply)
1. Hash the presented token, load row.
2. Missing / expired / `revokedAt` set → 401, clear cookies.
3. If `replacedById` is set → reuse (stolen token): revoke the **entire
   family**.
4. Else rotate: revoke old row, insert new hash in the same family, mint a
   new access JWT with current `auth_epoch`.

POST /auth/logout
- Revoke this family, clear both cookies. Other devices keep working.
- Current access cookie may work until `exp` (≤15 min). Do not bump
  `auth_epoch` here (that would log out every device).

Password change / disable / logout-all
- `auth_epoch += 1` and revoke all refresh rows for that user.
- Existing access tokens fail on the next `requireAuth` lookup.

requireAuth
1. Cookie or Bearer, as now.
2. `jwtVerify` (sig, exp, iss, aud, alg).
3. `findUserById(sub)` — no user or JWT `ver !== users.auth_epoch` → 401
   (this is what stops a JWT pasted after logout-all / password change /
   disable; normal logout does not bump epoch).
Do not consult `refresh_tokens` on every API call.

---

User deletion and financial retention (GDPR)

Current: no user-delete API. Postgres RESTRICT on `accounts.user_id` and
`transactions.user_id` → `users.id` so a bare ORM user delete fails when
financial rows exist. Email verification tokens still CASCADE with user.
See [transaction-design.md](./transaction-design.md) §6.4 and
`backend/tests/integration/user-deletion-policy.test.ts`.

Deferred product workflow (legal review required)
- Account closure (inactive/hidden, stop sync) vs erasure.
- Data export before deletion.
- Retention holds (tax, dispute, regulatory) vs anonymize PII.
- Admin or batch job with audit log — not `ON DELETE CASCADE` on financial tables.

---

HSTS preload

Current: production HTTPS responses send
`Strict-Transport-Security: max-age=15552000; includeSubDomains` (180 days).
Browsers remember HTTPS-only after they have already visited. `preload` is not
set, and the domain is not on Chrome’s HSTS preload list.

Changes (only when the apex domain is fully HTTPS and you will not need HTTP
on any subdomain)
- Raise `max-age` to at least `31536000` (1 year).
- Add `preload` to the HSTS header in `require-https.ts`.
- Submit the registrable domain at https://hstspreload.org/.
- Know that removal is slow (Chrome release cycle). Do not preload staging
  or a host you might still serve over HTTP.
