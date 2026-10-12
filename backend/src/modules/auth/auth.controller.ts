import type { RequestHandler } from "express";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { loginUser } from "./auth.service.ts";

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });
  res.status(HTTP_STATUS.OK).json(result);
};
