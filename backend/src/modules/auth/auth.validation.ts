import type { RequestHandler } from "express";
import { parseEmail, parsePassword } from "../../shared/validation/fields.ts";

export const validateLogin: RequestHandler = (req, _res, next) => {
  const body = req.body as Record<string, unknown>;
  req.body = {
    email: parseEmail(body.email),
    password: parsePassword(body.password),
  };
  next();
};
