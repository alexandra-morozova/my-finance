import type { Request, RequestHandler } from "express";
import { UnauthorizedException } from "../shared/errors/app-error.ts";
import { readAccessTokenCookie } from "../shared/http/cookies.ts";
import { verifyAccessToken } from "../shared/utils/jwt.ts";

export type AuthedRequest = Request & { userId: string };

function readAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) {
      return token;
    }
  }
  return readAccessTokenCookie(req);
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readAccessToken(req);
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
