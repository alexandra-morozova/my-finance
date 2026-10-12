import type { ErrorRequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.ts";
import { logger } from "../shared/logger/logger.ts";
import { env } from "../shared/env.ts";
import { HTTP_STATUS } from "../shared/utils/http-status.ts";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isAppError = err instanceof AppError;
  const status = isAppError
    ? err.status
    : typeof err === "object" && err && "status" in err && typeof err.status === "number"
      ? err.status
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

  if (!isAppError) {
    logger.error("Unhandled error", err);
  }

  const isProd = env.NODE_ENV === "production";
  const message =
    isAppError || !isProd
      ? err instanceof Error
        ? err.message
        : "Internal server error"
      : "Internal server error";

  res.status(status).json({
    status,
    message,
    ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
};
