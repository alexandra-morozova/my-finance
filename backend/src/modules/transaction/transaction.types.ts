import type {
  TransactionKind,
  TransactionSource,
  TransactionStatus,
} from "../../../generated/prisma/client.ts";

/** Public API shape for list/detail (enums serialize as strings in JSON). */
export type TransactionListItem = {
  id: string;
  accountId: string;
  amount: string;
  currency: string;
  /** Calendar date (`YYYY-MM-DD`) from `@db.Date`. */
  date: string;
  status: TransactionStatus;
  kind: TransactionKind;
  source: TransactionSource;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Decoded keyset position: `(date DESC, id DESC)` with tie-breaker on id. */
export type ListKeysetCursor = {
  date: Date;
  transactionId: string;
};

export type TransactionListResult = {
  items: TransactionListItem[];
  nextCursor: string | null;
};

/** Parsed HTTP query / filters for listing (no userId). */
export type ListTransactionFilters = {
  limit?: number;
  cursor?: string;
  accountId?: string;
  status?: TransactionStatus;
  from?: string;
  to?: string;
};

export type ListTransactionsInput = ListTransactionFilters & {
  userId: string;
};

/** Repository list query (decoded keyset, resolved limit). */
export type ListTransactionsQuery = Omit<ListTransactionFilters, "cursor"> & {
  userId: string;
  limit: number;
  keyset?: ListKeysetCursor;
};
