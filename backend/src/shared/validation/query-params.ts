import { AppError } from "../errors/app-error.ts";
import { HTTP_STATUS } from "../utils/http-status.ts";

export function badRequest(message: string): never {
  throw new AppError(HTTP_STATUS.BAD_REQUEST, message);
}

export function isQueryParamAbsent(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function rejectQueryArray(value: unknown, label: string): void {
  if (Array.isArray(value)) {
    badRequest(`${label} must be a single value`);
  }
}

export function optionalQueryString(value: unknown, label: string): string | undefined {
  if (isQueryParamAbsent(value)) {
    return undefined;
  }
  rejectQueryArray(value, label);
  if (typeof value !== "string") {
    badRequest("Invalid query parameter");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Non-empty query string with no leading or trailing whitespace. */
export function requireQueryString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    badRequest(`Invalid ${label}`);
  }
  if (value !== value.trim()) {
    badRequest(`Invalid ${label}`);
  }
  return value;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalIsoDateQuery(value: unknown, label: string): string | undefined {
  const raw = optionalQueryString(value, label);
  if (!raw) {
    return undefined;
  }
  if (!ISO_DATE.test(raw)) {
    badRequest(`${label} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    badRequest(`${label} is not a valid date`);
  }
  return raw;
}
