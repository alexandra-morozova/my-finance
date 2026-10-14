import {
  badRequest,
  isQueryParamAbsent,
  requireQueryString,
} from "../../shared/validation/query-params.ts";

export const DEFAULT_LIST_LIMIT = 50;
export const MIN_LIST_LIMIT = 1;
export const MAX_LIST_LIMIT = 100;

const LIMIT_PATTERN = /^(100|[1-9]\d?)$/;

export const LIST_LIMIT_ERROR = `limit must be an integer between ${MIN_LIST_LIMIT} and ${MAX_LIST_LIMIT}`;

function assertListLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < MIN_LIST_LIMIT || limit > MAX_LIST_LIMIT) {
    badRequest(LIST_LIMIT_ERROR);
  }
  return limit;
}

/** Programmatic callers (service, jobs, tests): default when omitted; strict integer range. */
export function resolveListLimit(limit: number | undefined): number {
  return limit === undefined ? DEFAULT_LIST_LIMIT : assertListLimit(limit);
}

/** `GET /transactions?limit=` — omitted/empty allowed; strings must match 1–100 with no junk. */
export function parseOptionalLimit(value: unknown): number | undefined {
  if (isQueryParamAbsent(value)) {
    return undefined;
  }
  const raw = requireQueryString(value, "limit");
  if (!LIMIT_PATTERN.test(raw)) {
    badRequest(LIST_LIMIT_ERROR);
  }
  return assertListLimit(Number(raw));
}
