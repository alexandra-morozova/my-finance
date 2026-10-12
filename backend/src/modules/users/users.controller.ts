import type { RequestHandler } from "express";
import type { AuthedRequest } from "../../middleware/require-auth.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { getCurrentUser } from "./users.service.ts";

export const getUser: RequestHandler = async (req, res) => {
  const user = await getCurrentUser((req as AuthedRequest).userId);
  res.status(HTTP_STATUS.OK).json({ user });
};
