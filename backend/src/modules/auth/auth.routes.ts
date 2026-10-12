import { Router } from "express";
import { loginRateLimit, registerRateLimit } from "../../middleware/rate-limit.ts";
import { login, register } from "./auth.controller.ts";
import { validateLogin, validateRegister } from "./auth.validation.ts";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, validateLogin, login);
authRouter.post("/register", registerRateLimit, validateRegister, register);
