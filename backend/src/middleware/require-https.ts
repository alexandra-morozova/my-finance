import type { RequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.ts";
import { env } from "../shared/env.ts";
import { HTTP_STATUS } from "../shared/utils/http-status.ts";

const HSTS = "max-age=15552000; includeSubDomains";

export const requireHttps: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV !== "production") {
    next();
    return;
  }

  if (!req.secure) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, "HTTPS required");
  }

  res.setHeader("Strict-Transport-Security", HSTS);
  next();
};
