import { AppError } from "../errors/app-error.ts";
import { HTTP_STATUS } from "../utils/http-status.ts";

/** Ensures Express `req.body` is a plain JSON object before field-level parsing. */
export function parseJsonObjectBody(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Request body is required");
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}
