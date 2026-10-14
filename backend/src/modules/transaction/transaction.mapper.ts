import type { TransactionListRow } from "./transaction.repository.ts";
import type { TransactionListItem } from "./transaction.types.ts";

export function toTransactionResponse(row: TransactionListRow): TransactionListItem {
  return {
    id: row.id,
    accountId: row.accountId,
    amount: row.amount.toString(),
    currency: row.currency,
    date: row.date.toISOString().slice(0, 10),
    status: row.status,
    kind: row.kind,
    source: row.source,
    memo: row.memo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
