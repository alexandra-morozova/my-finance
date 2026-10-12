import type { RequestHandler } from "express";
import { AppError } from "../../shared/errors/app-error.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegister: RequestHandler = (req, _res, next) => {
  const body = req.body as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!EMAIL.test(email) || email.length > 254) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Email is invalid");
  }
  if (!password) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Password is required");
  }
  if (!name) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Name is required");
  }

  req.body = { email, password, name };
  next();
};
