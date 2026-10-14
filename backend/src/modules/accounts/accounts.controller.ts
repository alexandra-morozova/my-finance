import type { RequestHandler } from "express";
import type { AuthedRequest } from "../../middleware/require-auth.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { toAccountResponse } from "./accounts.mapper.ts";
import { createAccountForUser, getAccountsForUser } from "./accounts.service.ts";
import type { CreateAccountRequest } from "./accounts.validation.ts";

export const listAccounts: RequestHandler = async (req, res) => {
  const accounts = await getAccountsForUser((req as AuthedRequest).userId);
  res.status(HTTP_STATUS.OK).json({ accounts: accounts.map(toAccountResponse) });
};

export const createAccount: RequestHandler = async (req, res) => {
  const { userId, body } = req as CreateAccountRequest;
  const account = await createAccountForUser(userId, body);
  res.status(HTTP_STATUS.CREATED).json({ account: toAccountResponse(account) });
};
