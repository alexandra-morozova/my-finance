import type { Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../database/prisma.ts";
import type { ListKeysetCursor, ListTransactionsQuery } from "./transaction.types.ts";

const transactionSelect = {
  id: true,
  accountId: true,
  amount: true,
  currency: true,
  date: true,
  status: true,
  kind: true,
  source: true,
  memo: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type TransactionListRow = Prisma.TransactionGetPayload<{ select: typeof transactionSelect }>;

/**
 * Next page for `orderBy: [{ date: 'desc' }, { id: 'desc' }]`.
 * Rows strictly before the cursor in that sort order:
 * older calendar date, or same date with lexicographically smaller id.
 */
function keysetAfterDescending(keyset: ListKeysetCursor): Prisma.TransactionWhereInput {
  const { date: keysetDate, transactionId } = keyset;
  return {
    OR: [
      { date: { lt: keysetDate } },
      {
        AND: [
          { date: { equals: keysetDate } },
          { id: { lt: transactionId } },
        ],
      },
    ],
  };
}

function listFiltersWhere(query: ListTransactionsQuery): Prisma.TransactionWhereInput {
  const dateFilter: Prisma.DateTimeFilter | undefined =
    query.from || query.to
      ? {
          ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
          ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
        }
      : undefined;

  return {
    userId: query.userId,
    deletedAt: null,
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
  };
}

function keysetWhere(query: ListTransactionsQuery): Prisma.TransactionWhereInput {
  const filters = listFiltersWhere(query);
  if (!query.keyset) {
    return filters;
  }
  return {
    AND: [filters, keysetAfterDescending(query.keyset)],
  };
}

export type ListTransactionsPage = {
  /** Visible page: never more than `limit` rows (lookahead row is excluded). */
  rows: TransactionListRow[];
  /** True when an additional row exists beyond `rows`. */
  hasMore: boolean;
};

export async function listTransactions(query: ListTransactionsQuery): Promise<ListTransactionsPage> {
  const { limit } = query;
  const fetched = await prisma.transaction.findMany({
    where: keysetWhere(query),
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: transactionSelect,
  });

  const hasMore = fetched.length > limit;
  const rows = hasMore ? fetched.slice(0, limit) : fetched;

  return { rows, hasMore };
}

export async function findTransactionByIdForUser(
  userId: string,
  transactionId: string,
): Promise<TransactionListRow | null> {
  return prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    select: transactionSelect,
  });
}
