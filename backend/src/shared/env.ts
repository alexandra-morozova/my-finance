function required(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

const BASE_URL = required("BASE_URL", "http://localhost:4000");
const FRONTEND_URL = required("FRONTEND_URL");

export const env = {
  PORT: Number(required("PORT", "4000")),
  BASE_URL,
  NODE_ENV: required("NODE_ENV", "development"),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: required("JWT_EXPIRES_IN"),
  JWT_ISSUER: required("JWT_ISSUER", BASE_URL),
  JWT_AUDIENCE: required("JWT_AUDIENCE", FRONTEND_URL),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: required("JWT_REFRESH_EXPIRES_IN"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
  CRON_SECRET: required("CRON_SECRET"),
  FRONTEND_URL,
} as const;
