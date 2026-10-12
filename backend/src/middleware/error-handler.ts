import type { ErrorRequestHandler, RequestHandler } from "express";
import { HTTP_STATUS } from "../config/http.config.ts";
import { env } from "../config/env.config.ts";
import { AppError, NotFoundException } from "../utils/app-error.ts";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new NotFoundException());
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isAppError = err instanceof AppError;
  const status = isAppError
    ? err.status
    : typeof err === "object" && err && "status" in err && typeof err.status === "number"
      ? err.status
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

  if (!isAppError) {
    console.error(err);
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
