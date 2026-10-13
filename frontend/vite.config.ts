import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const apiProxy = {
  target: API_PROXY_TARGET,
  changeOrigin: true,
} as const;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy: {
      "/auth": apiProxy,
      "/users": apiProxy,
      "/health": apiProxy,
    },
  },
});
