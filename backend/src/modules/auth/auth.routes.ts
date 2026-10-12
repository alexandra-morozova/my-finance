import { Router } from "express";
import { loginRateLimit } from "../../middleware/rate-limit.ts";
import { login } from "./auth.controller.ts";
import { validateLogin } from "./auth.validation.ts";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, validateLogin, login);
