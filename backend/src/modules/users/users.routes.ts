import { Router } from "express";
import { register } from "./users.controller.ts";
import { validateRegister } from "./users.validation.ts";

export const usersRouter = Router();

usersRouter.post("/register", validateRegister, register);
