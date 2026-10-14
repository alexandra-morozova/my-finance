Done
- Switched from npm to pnpm
- Removed empty backend stub; Express API lives in backend
- TypeScript via Node (src/index.ts), no Next.js
- Env: Node --env-file / --env-file-if-exists, parsed in env.config.ts
- HTTP_STATUS const object in http.config.ts
- CORS locked to FRONTEND_URL with credentials
- JSON body parser (no urlencoded)
- GET /health
- Scripts: pnpm dev, start, typecheck
- BASE_URL env (API origin); FRONTEND_URL remains CORS origin
- Error handler + 404; AppError, Unauthorized/NotFound/InternalServerError exceptions
- Express 5: no asyncHandler
- bcrypt hash/compare in utils/bcrypt.ts; registerUser/setUserPassword hash in user.service (no schema.pre save)
- Agent docs: backend/AGENTS.md + .cursor/rules (DDD, Express, Postgres/Prisma)
- Cutover: Mongo/Mongoose → PostgreSQL 17 + Prisma 7 (host 5433); connectDatabase pings Postgres before listen
- Scripts: db:generate, db:migrate, db:deploy, db:studio
- Feature modules: `src/modules/<name>/` (routes, controller, service, repository, validation, types); `app.ts` + `server.ts` (DB connect then listen)
- Prisma client output moved to `backend/generated/` (gitignored); schema/migrations stay in `backend/prisma/`
- Shared kernel: errors, logger, bcrypt, jwt (`jose`), env, field parsers (`parseEmail` / `parsePassword` / `parseName`)
- Auth: `POST /auth/login` sets httpOnly `access_token` cookie (Secure in prod, SameSite=Lax); JSON returns `{ user }` only; `requireAuth` accepts cookie or Bearer
- CSRF: mutating requests (including login/register with no cookie) require `Origin === FRONTEND_URL` unless Bearer; CORS on every request locked to `FRONTEND_URL`
- `GET /users/me` (requireAuth) returns the current user from the cookie/Bearer `sub`
- Register: `POST /auth/register`; generic 201 (no email enumeration); unique race → `EmailTakenError` in repository
- Passwords: bcrypt 12 rounds; min 12 / max 72 chars; login bcrypts a dummy hash when the email is unknown
- Rate limit login (10 / 15 min) and register (5 / hour) in-memory per IP+email; `429`
- Production HTTPS: `requireHttps`, HSTS 180 days, `trust proxy` 1; `/health` stays open
- Cursor rules: application-structure, express-api, express-http, persistence, testing

## Email verification (not implemented)

- Design: [email-verification-design.md](./email-verification-design.md)
- Backlog: [email-verification-implementation.md](./email-verification-implementation.md)
