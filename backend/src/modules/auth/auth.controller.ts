import type { RequestHandler } from "express";
import { setAccessTokenCookie } from "../../shared/http/cookies.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { registerUser } from "../users/users.service.ts";
import { loginUser } from "./auth.service.ts";

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken } = await loginUser({ email, password });
  setAccessTokenCookie(res, accessToken);
  res.status(HTTP_STATUS.OK).json({ user });
};

export const register: RequestHandler = async (req, res) => {
  const { email, password, name } = req.body;
  await registerUser({ email, password, name });
  res.status(HTTP_STATUS.CREATED).json({
    message: "If this email is not already registered, the account was created.",
  });
};
