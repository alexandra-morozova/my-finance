import { isUuid } from "../../shared/validation/uuid.ts";

/** Max length for keyset pagination tokens (`date|uuid`). */
const KEYSET_TOKEN_MAX_LENGTH = 128;

/**
 * UTC midnight instant for a `@db.Date` column (always `…T00:00:00.000Z` from Prisma).
 * Used with {@link encodeListKeyset} / list `orderBy: [{ date: desc }, { id: desc }]`.
 */
const KEYSET_DATE_PART = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;

/**
 * Builds a opaque pagination token. `transactionId` is required: many rows share the same
 * calendar `date`, so id breaks ties and keeps keyset pagination stable.
 */
export function encodeListKeyset(date: Date, transactionId: string): string {
  return `${date.toISOString()}|${transactionId}`;
}

/**
 * Parses a list keyset token from `nextCursor` / `cursor` query param.
 * Returns null on malformed input (never throws).
 */
export function decodeListKeyset(token: string): { date: Date; transactionId: string } | null {
  if (typeof token !== "string") {
    return null;
  }
  if (token.length === 0 || token.length > KEYSET_TOKEN_MAX_LENGTH || token !== token.trim()) {
    return null;
  }

  const separator = token.indexOf("|");
  if (separator <= 0 || separator >= token.length - 1) {
    return null;
  }
  if (token.indexOf("|", separator + 1) !== -1) {
    return null;
  }

  const datePart = token.slice(0, separator);
  const transactionId = token.slice(separator + 1);

  if (!KEYSET_DATE_PART.test(datePart) || !isUuid(transactionId)) {
    return null;
  }

  const date = new Date(datePart);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== datePart) {
    return null;
  }

  return { date, transactionId };
}
