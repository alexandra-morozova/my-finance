import type { RequestHandler } from "express";
import { parseEmail, parseName, parsePassword } from "../../shared/validation/fields.ts";
import { parseJsonObjectBody } from "../../shared/validation/json-body.ts";

export const validateLogin: RequestHandler = (req, _res, next) => {
  const body = parseJsonObjectBody(req.body);
  req.body = {
    email: parseEmail(body.email),
    password: parsePassword(body.password),
  };
  next();
};

export const validateRegister: RequestHandler = (req, _res, next) => {
  const body = parseJsonObjectBody(req.body);
  req.body = {
    email: parseEmail(body.email),
    password: parsePassword(body.password),
    name: parseName(body.name),
  };
  next();
};
