# MyFinance frontend

Vite + React + TypeScript. Ant Design + SCSS. pnpm.

- `pnpm dev` — http://localhost:5173
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build`
- API: the client calls relative paths (`/auth`, `/users`). Local dev uses the proxy in `vite.config.ts` (see `frontend/.env.example`).
