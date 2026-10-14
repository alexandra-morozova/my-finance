import type { RequestHandler } from "express";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { getTransactionForUser, getTransactionsForUser } from "./transaction.service.ts";
import type { GetTransactionRequest, ListTransactionsRequest } from "./transaction.validation.ts";

export const listTransactions: RequestHandler = async (req, res) => {
  const { userId, listQuery } = req as ListTransactionsRequest;
  const result = await getTransactionsForUser({ userId, ...listQuery });
  res.status(HTTP_STATUS.OK).json(result);
};

export const getTransaction: RequestHandler = async (req, res) => {
  const { userId, transactionId } = req as GetTransactionRequest;
  const transaction = await getTransactionForUser(userId, transactionId);
  res.status(HTTP_STATUS.OK).json({ transaction });
};
