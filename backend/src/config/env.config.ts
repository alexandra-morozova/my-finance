function required(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(required("PORT", "4000")),
  BASE_URL: required("BASE_URL", "http://localhost:4000"),
  NODE_ENV: required("NODE_ENV", "development"),
  MONGO_URI: required("MONGO_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: required("JWT_EXPIRES_IN"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: required("JWT_REFRESH_EXPIRES_IN"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
  CRON_SECRET: required("CRON_SECRET"),
  FRONTEND_URL: required("FRONTEND_URL"),
} as const;
