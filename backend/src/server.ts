import type { Server } from "node:http";
import { app } from "./app.ts";
import { connectDatabase, disconnectDatabase } from "./database/prisma.ts";
import { logger } from "./shared/logger/logger.ts";
import { env } from "./shared/env.ts";
import { markShuttingDown } from "./shared/shutdown-state.ts";

await connectDatabase();

let shutdownStarted = false;

const server: Server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`Server running on ${env.BASE_URL}`);
});

async function shutdown(reason: string): Promise<void> {
  if (shutdownStarted) {
    logger.info("Shutdown already in progress; forcing exit");
    process.exit(1);
    return;
  }
  shutdownStarted = true;
  markShuttingDown();
  logger.info(`Shutdown started (${reason})`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Shutdown timed out");
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await disconnectDatabase();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error("Shutdown failed", err);
    process.exit(1);
  } finally {
    clearTimeout(forceExitTimer);
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
