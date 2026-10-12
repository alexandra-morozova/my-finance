import process from "node:process";
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  // prisma generate can run without a local .env
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
