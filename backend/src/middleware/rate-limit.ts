import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { HTTP_STATUS } from "../shared/utils/http-status.ts";

// In-memory counters: reset on process restart and are not shared across instances.
// Shared store (Redis): see docs/for-next-version-be.md

function tooManyRequests(message: string) {
  return (_req: Request, res: Response) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      message,
    });
  };
}

function clientKey(req: Request): string {
  const ip = req.ip ? ipKeyGenerator(req.ip) : "unknown";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return email ? `${ip}:${email}` : ip;
}

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: tooManyRequests("Too many login attempts. Try again later."),
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: tooManyRequests("Too many registration attempts. Try again later."),
});
