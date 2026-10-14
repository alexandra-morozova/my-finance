import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.ts";
import { createAccount, listAccounts } from "./accounts.controller.ts";
import { validateCreateAccount } from "./accounts.validation.ts";

export const accountsRouter = Router();

accountsRouter.get("/", requireAuth, listAccounts);
accountsRouter.post("/", requireAuth, validateCreateAccount, createAccount);
