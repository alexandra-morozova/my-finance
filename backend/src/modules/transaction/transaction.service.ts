import { AppError, NotFoundException } from "../../shared/errors/app-error.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import { assertAccountOwned } from "../accounts/accounts.service.ts";
import { resolveListLimit } from "./transaction.list-limit.ts";
import { decodeListKeyset, encodeListKeyset } from "./transaction.pagination.ts";
import { toTransactionResponse } from "./transaction.mapper.ts";
import { findTransactionByIdForUser, listTransactions } from "./transaction.repository.ts";
import type {
  ListKeysetCursor,
  ListTransactionsInput,
  TransactionListItem,
  TransactionListResult,
} from "./transaction.types.ts";

export async function getTransactionsForUser(
  input: ListTransactionsInput,
): Promise<TransactionListResult> {
  const limit = resolveListLimit(input.limit);

  if (input.accountId) {
    await assertAccountOwned(input.userId, input.accountId);
  }

  let keyset: ListKeysetCursor | undefined;
  if (input.cursor) {
    const decoded = decodeListKeyset(input.cursor);
    if (!decoded) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, "Invalid cursor");
    }
    keyset = decoded;
  }

  const { rows, hasMore } = await listTransactions({
    userId: input.userId,
    limit,
    keyset,
    accountId: input.accountId,
    status: input.status,
    from: input.from,
    to: input.to,
  });

  const items = rows.map(toTransactionResponse);
  // Cursor from the last row of the trimmed page — not the internal limit+1 lookahead.
  const lastReturned = rows.at(-1);
  const nextCursor =
    hasMore && lastReturned
      ? encodeListKeyset(lastReturned.date, lastReturned.id)
      : null;

  return { items, nextCursor };
}

export async function getTransactionForUser(
  userId: string,
  transactionId: string,
): Promise<TransactionListItem> {
  const row = await findTransactionByIdForUser(userId, transactionId);
  if (!row) {
    throw new NotFoundException("Transaction not found");
  }
  return toTransactionResponse(row);
}
