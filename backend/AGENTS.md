# MyFinance backend — agent notes

## Decision: pragmatic DDD + PostgreSQL

We separate **domain** from **persistence**. Auth, accounts, and ledgers will have real rules; services must not depend on the DB library.

**Persistence:** PostgreSQL 17 + Prisma 7. Do not add Mongoose or Drizzle.

- **Do not** put Prisma types, `JsonValue`, or password hashes on domain objects. Domain `id` is `string`.
- **Do not** add a generic `Repository<T>` that only wraps `find`/`create`.
- **Do not** import `prisma` / `PrismaClient` from routes or services. Go through the repository.
- Hash/compare in `utils/bcrypt.ts`. Call from a **service** before the repository writes (`registerUser` / `setUserPassword`). No Prisma middleware for passwords.

Prisma schema is the table source of truth. `prisma migrate` is the migration source of truth.

## Layout (`src` + `prisma`)

```
prisma.config.ts       # DATABASE_URL for CLI (Prisma 7)
prisma/schema.prisma   # models
prisma/migrations/     # committed
src/generated/prisma/  # prisma generate; gitignore
domain/                # plain types (User, later Account)
repositories/          # map rows ↔ domain; only layer that imports prisma
services/              # use-cases; hash passwords here
config/                # env, http status, PrismaClient + adapter
middleware/            # errorHandler last; notFound after routes
utils/                 # AppError, bcrypt
```

When adding an aggregate (copy User):

1. `domain/<name>.ts` — `id: string`, business fields, no Prisma.
2. Model in `prisma/schema.prisma` + migrate.
3. `repositories/<name>.repository.ts` — map uuid → `id`.
4. `services/` for use-cases. Throw `AppError` subclasses from services/routes.

Example (User):

- Domain: `src/domain/user.ts` (`User`, `NewUser`)
- DB: `User` / `users`, `passwordHash` omitted from default selects
- Repo: `createUser`, `findUserById`, `findUserByEmail`, `findUserCredentialsByEmail` (login only)

## Other stack rules

- Package manager: **pnpm**. Express **5** (no `asyncHandler`; rejected promises reach `errorHandler`).
- Env: Node `--env-file` / `--env-file-if-exists`; parse in `config/env.config.ts`. Never log secrets.
- Connect DB **before** `listen`. Fail with `console.error` + `process.exit(1)`. JSON logger later — `for-next-version`.
- Errors: `AppError` + `UnauthorizedException` / `NotFoundException` / `InternalServerErrorException`. `notFound` then `errorHandler` after all routes.
- Local Postgres: `docker compose up -d` at repo root; `DATABASE_URL=postgres://myfinance:myfinance@localhost:5433/myfinance` (host 5433 → container 5432).
- Migrations: `prisma migrate dev` / `deploy`. Commit `prisma/migrations/`.
