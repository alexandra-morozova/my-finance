import type { RequestHandler } from "express";
import type { AuthedRequest } from "../../middleware/require-auth.ts";
import { AppError } from "../../shared/errors/app-error.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { isUuid } from "../../shared/validation/uuid.ts";
import { parseListTransactionsQuery } from "./transaction.list-query.ts";
import type { ListTransactionFilters } from "./transaction.types.ts";

function parseRouteTransactionId(value: string): string {
  if (!isUuid(value)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "transaction id must be a valid UUID");
  }
  return value;
}

export type ListTransactionsRequest = AuthedRequest & {
  listQuery: ListTransactionFilters;
};

export type GetTransactionRequest = AuthedRequest & {
  transactionId: string;
};

function readRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export const validateListTransactions: RequestHandler = (req, _res, next) => {
  (req as ListTransactionsRequest).listQuery = parseListTransactionsQuery(
    req.query as Record<string, unknown>,
  );
  next();
};

export const validateTransactionId: RequestHandler = (req, _res, next) => {
  (req as GetTransactionRequest).transactionId = parseRouteTransactionId(
    readRouteParam(req.params.id),
  );
  next();
};
