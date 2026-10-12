import type { Request, RequestHandler } from "express";
import { UnauthorizedException } from "../shared/errors/app-error.ts";
import { verifyAccessToken } from "../shared/utils/jwt.ts";

export type AuthedRequest = Request & { userId: string };

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedException());
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    next(new UnauthorizedException());
    return;
  }

  try {
    (req as AuthedRequest).userId = await verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedException());
  }
};
