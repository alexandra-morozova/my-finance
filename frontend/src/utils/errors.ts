import { ApiError } from "@/services/api.ts";

export function getRequestErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
