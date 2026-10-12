import type { RequestHandler } from "express";
import { UnauthorizedException } from "../shared/errors/app-error.ts";

/** Requires `Authorization: Bearer <token>`. JWT verification belongs with login. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ") || header.slice("Bearer ".length).trim() === "") {
    next(new UnauthorizedException());
    return;
  }
  next();
};
