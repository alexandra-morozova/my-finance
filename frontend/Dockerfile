# Frontend image stages for local Compose and CI asset builds.
# AWS delivery uses the `export` stage output (static files) via S3/CloudFront —
# do not run a long-lived frontend container in ECS.

ARG NODE_VERSION=22
ARG PNPM_VERSION=12.11.2

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV PNPM_HOME="/pnpm" \
  PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# nodeLinker: hoisted is set in pnpm-workspace.yaml.
RUN pnpm install --frozen-lockfile

# Vite dev server (Compose profile `dev-ui`)
FROM deps AS development
COPY index.html ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts vitest.config.ts ./
COPY public ./public
COPY src ./src
EXPOSE 5173
# Bind all interfaces so the published host port reaches the container.
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]

# Production static build
FROM deps AS build
COPY index.html ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY public ./public
COPY src ./src
# Client uses same-origin relative API paths today. If a public API origin is
# introduced later, pass only non-secret VITE_* build args here — never secrets.
RUN pnpm build

# Copy-out stage for CI (`docker build --target export` + copy /dist)
FROM scratch AS export
COPY --from=build /app/dist /dist
