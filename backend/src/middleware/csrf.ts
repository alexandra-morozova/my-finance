import type { RequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.ts";
import { env } from "../shared/env.ts";
import { readAccessTokenCookie } from "../shared/http/cookies.ts";
import { HTTP_STATUS } from "../shared/utils/http-status.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const rejectCookieCsrf: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (req.headers.authorization?.startsWith("Bearer ")) {
    next();
    return;
  }
  if (!readAccessTokenCookie(req)) {
    next();
    return;
  }
  if (req.headers.origin === env.FRONTEND_URL) {
    next();
    return;
  }
  throw new AppError(HTTP_STATUS.FORBIDDEN, "Cross-site request blocked");
};
