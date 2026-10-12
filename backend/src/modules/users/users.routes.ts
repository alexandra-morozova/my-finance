import { Router } from "express";
import { registerRateLimit } from "../../middleware/rate-limit.ts";
import { register } from "./users.controller.ts";
import { validateRegister } from "./users.validation.ts";

export const usersRouter = Router();

usersRouter.post("/register", registerRateLimit, validateRegister, register);
