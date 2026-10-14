import type { RequestHandler } from "express";
import { AccountType } from "../../../generated/prisma/client.ts";
import type { AuthedRequest } from "../../middleware/require-auth.ts";
import { AppError } from "../../shared/errors/app-error.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { parseCurrencyCode } from "../../shared/validation/currency.ts";
import { parseName } from "../../shared/validation/fields.ts";
import { parseJsonObjectBody } from "../../shared/validation/json-body.ts";
import type { NewAccount } from "./accounts.types.ts";

const ACCOUNT_TYPES = new Set<string>(Object.values(AccountType));

export function parseAccountType(value: unknown): AccountType {
  if (value === undefined || value === null || value === "") {
    return AccountType.CHECKING;
  }
  const type = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!ACCOUNT_TYPES.has(type)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Account type is invalid");
  }
  return type as AccountType;
}

export type CreateAccountRequest = AuthedRequest & {
  body: NewAccount;
};

export const validateCreateAccount: RequestHandler = (req, _res, next) => {
  const body = parseJsonObjectBody(req.body);
  (req as CreateAccountRequest).body = {
    name: parseName(body.name),
    type: parseAccountType(body.type),
    currency: parseCurrencyCode(body.currency),
  };
  next();
};
