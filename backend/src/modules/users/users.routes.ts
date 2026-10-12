import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.ts";
import { getUser } from "./users.controller.ts";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, getUser);
