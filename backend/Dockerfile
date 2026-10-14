# Backend API image for local Compose and (later) ECS.
# Runtime runs TypeScript directly via Node (see package.json "start").
# Prisma Client is generated explicitly at build time into generated/prisma
# (see prisma/schema.prisma generator output). Schema migrations are NOT run
# on start; use the dedicated `migrate` target (or Compose migrate profile).

ARG NODE_VERSION=22
ARG PNPM_VERSION=12.11.2

# --- lean OS + Node only (final API runtime starts here) ---
FROM node:${NODE_VERSION}-bookworm-slim AS runtime-base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- build/install tooling (Corepack + pnpm); not copied into production ---
FROM runtime-base AS tooling
ARG PNPM_VERSION
# Shared Corepack/pnpm homes so prepare is offline-usable for any later user.
# Migrate invokes the Prisma CLI via `node` (no Corepack download on start).
ENV COREPACK_HOME=/usr/local/share/corepack \
  PNPM_HOME=/pnpm \
  PATH="/pnpm:$PATH"
RUN mkdir -p "$COREPACK_HOME" "$PNPM_HOME" \
  && corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate \
  && chmod -R a+rX "$COREPACK_HOME" "$PNPM_HOME"

# --- full dependencies for generate / migrate / development ---
FROM tooling AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# nodeLinker: hoisted is set in pnpm-workspace.yaml for predictable multi-stage copies.
# Lifecycle scripts audited for this lockfile: only prisma, @prisma/engines, and
# esbuild (via vitest) define install/preinstall/postinstall. Install without
# scripts, then rebuild exactly those packages (allowBuilds in pnpm-workspace.yaml).
# Root package.json postinstall (prisma generate) is skipped on purpose — see `build`.
RUN pnpm install --frozen-lockfile --ignore-scripts \
  && pnpm rebuild prisma @prisma/engines esbuild

# --- explicit Prisma Client generation ---
# generator output = "../generated/prisma" → /app/generated/prisma
FROM deps AS build
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    pnpm exec prisma generate

# --- production dependencies only (isolated from development dependencies) ---
FROM tooling AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Prod install with --ignore-scripts: prisma CLI / @prisma/engines / esbuild are
# in the development dependency graph and are not installed here. Prisma 7 client
# uses custom output + PostgreSQL driver adapter; no engine-download at runtime.
# Re-audit install scripts if runtime dependencies change.
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# --- local development target ---
FROM build AS development
ENV NODE_ENV=development
COPY tsconfig.json ./
COPY src ./src
EXPOSE 4000
# Env comes from Compose; do not require a baked-in .env file.
CMD ["node", "--watch", "src/server.ts"]

# --- production API runtime (lean: no Corepack/pnpm) ---
# Env from Compose env_file/environment or ECS task config — not a container .env file.
FROM runtime-base AS production
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/generated/prisma ./generated/prisma
COPY --chown=node:node package.json tsconfig.json ./
COPY --chown=node:node src ./src

USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the API only. Do not migrate here.
CMD ["node", "src/server.ts"]

# --- one-off migrations (full dep tree from `build`, including Prisma CLI) ---
FROM build AS migrate
# One-off job: no API /health probe (would mark long migrations unhealthy).
HEALTHCHECK NONE
RUN chown -R node:node /app
USER node
# Invokes the package bin directly so Corepack/pnpm are not required at runtime.
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]
