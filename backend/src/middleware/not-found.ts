import type { RequestHandler } from "express";
import { NotFoundException } from "../shared/errors/app-error.ts";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new NotFoundException());
};
