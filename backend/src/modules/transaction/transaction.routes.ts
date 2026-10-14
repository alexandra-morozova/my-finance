import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.ts";
import { getTransaction, listTransactions } from "./transaction.controller.ts";
import { validateListTransactions, validateTransactionId } from "./transaction.validation.ts";

export const transactionRouter = Router();

transactionRouter.get("/", requireAuth, validateListTransactions, listTransactions);
transactionRouter.get("/:id", requireAuth, validateTransactionId, getTransaction);
