import { TransactionStatus } from "../../../generated/prisma/client.ts";
import {
  badRequest,
  isQueryParamAbsent,
  optionalQueryString,
  parseOptionalIsoDateQuery,
  requireQueryString,
} from "../../shared/validation/query-params.ts";
import { isUuid } from "../../shared/validation/uuid.ts";
import { decodeListKeyset } from "./transaction.pagination.ts";
import { parseOptionalLimit } from "./transaction.list-limit.ts";
import type { ListTransactionFilters } from "./transaction.types.ts";

const STATUSES = new Set<string>(Object.values(TransactionStatus));

function parseOptionalUuidQuery(value: unknown, label: string): string | undefined {
  const raw = optionalQueryString(value, label);
  if (!raw) {
    return undefined;
  }
  if (!isUuid(raw)) {
    badRequest(`${label} must be a valid UUID`);
  }
  return raw;
}

function parseOptionalStatus(value: unknown): TransactionStatus | undefined {
  const raw = optionalQueryString(value, "status");
  if (!raw) {
    return undefined;
  }
  const status = raw.toUpperCase();
  if (!STATUSES.has(status)) {
    badRequest("status is invalid");
  }
  return status as TransactionStatus;
}

export function parseOptionalListCursor(value: unknown): string | undefined {
  if (isQueryParamAbsent(value)) {
    return undefined;
  }
  const raw = requireQueryString(value, "cursor");
  if (!decodeListKeyset(raw)) {
    badRequest("Invalid cursor");
  }
  return raw;
}

/** Validates `GET /transactions` query params (no database access). */
export function parseListTransactionsQuery(q: Record<string, unknown>): ListTransactionFilters {
  const limit = parseOptionalLimit(q.limit);
  const cursor = parseOptionalListCursor(q.cursor);
  const accountId = parseOptionalUuidQuery(q.accountId, "accountId");
  const status = parseOptionalStatus(q.status);
  const from = parseOptionalIsoDateQuery(q.from, "from");
  const to = parseOptionalIsoDateQuery(q.to, "to");

  if (from && to && from > to) {
    badRequest("from must be on or before to");
  }

  return { limit, cursor, accountId, status, from, to };
}
