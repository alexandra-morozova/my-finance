# MyFinance backend — agent notes

## Decision: pragmatic DDD

We separate **domain** from **Mongo**. Auth, accounts, and ledgers will have real rules; services must not depend on Mongoose.

- **Do not** put Mongoose types, `_id`, `__v`, `.save()`, or password hashes on domain objects.
- **Do not** `interface XDocument extends Document` (duplicate fields, clashes with DOM `Document`).
- **Do not** add a generic `Repository<T>` that only wraps `find`/`create`.
- **Do not** import `*Model` from routes or services. Go through the repository.
- Hash/compare in `utils/bcrypt.ts`. Call that from a **service** before the repository writes (`registerUser` / `setUserPassword`). Do **not** use `userSchema.pre("save")` — that ties hashing to Mongoose.

Mongoose 9: schema is the source of truth. Infer DB types with `InferSchemaType` and `HydratedDocument`.

## Layout (`src`)

```
domain/           # plain types (User, later Account, Transaction)
models/           # mongoose schemas + UserModel only
repositories/     # map docs ↔ domain; the only layer that imports models
services/         # use-cases; hash passwords here, not in schema hooks
config/           # env, http status, db connect
middleware/       # errorHandler last; notFound after routes
utils/            # AppError, bcrypt
```

When adding an aggregate (copy User):

1. `domain/<name>.ts` — `id: string`, business fields, no Mongo.
2. `models/<name>.model.ts` — schema + `*Raw` / `*Doc` / `*Model`.
3. `repositories/<name>.repository.ts` — `to<Name>()`, `_id.toString()` → `id`.
4. `services/` for use-cases. Throw `AppError` subclasses from services/routes, not from models.

Example (User):

- Domain: `src/domain/user.ts` (`User`, `NewUser`)
- DB: `src/models/user.model.ts` (`password` is `select: false`)
- Repo: `createUser`, `findUserById`, `findUserByEmail`, `findUserCredentialsByEmail` (login only; returns hash)

## Other stack rules

- Package manager: **pnpm**. Express **5** (no `asyncHandler`; rejected promises reach `errorHandler`).
- Env: Node `--env-file` / `--env-file-if-exists`; parse in `config/env.config.ts`. Never log secrets.
- Connect Mongo **before** `listen`. Fail with `console.error` + `process.exit(1)`. JSON logger later (CloudWatch/Coralogix).
- Errors: `AppError` + `UnauthorizedException` / `NotFoundException` / `InternalServerErrorException`. `notFound` then `errorHandler` after all routes.
- Local Mongo: `docker compose up -d` at repo root; `MONGO_URI=mongodb://localhost:27017/myfinance`.
