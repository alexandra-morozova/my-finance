import type { RequestHandler } from "express";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { registerUser } from "./users.service.ts";

export const register: RequestHandler = async (req, res) => {
  const { email, password, name } = req.body;
  const user = await registerUser({ email, password, name });
  res.status(HTTP_STATUS.CREATED).json(user);
};
