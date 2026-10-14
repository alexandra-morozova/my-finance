import { app } from "./app.ts";
import { connectDatabase } from "./database/prisma.ts";
import { logger } from "./shared/logger/logger.ts";
import { env } from "./shared/env.ts";

await connectDatabase();

// Bind all interfaces so ALB/Compose can reach the process (not loopback-only).
app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`Server running on ${env.BASE_URL}`);
});
