import { ApiError } from "./api.ts";
import type {
  AuthLoginResponse,
  AuthRegisterResponse,
  MeResponse,
} from "./api-types.ts";
import type { User } from "@/types/user.ts";

const INVALID_RESPONSE = "Invalid response from server";

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new ApiError(502, INVALID_RESPONSE);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new ApiError(502, INVALID_RESPONSE);
  }
  return value;
}

export function parseUser(value: unknown): User {
  const record = parseRecord(value);
  return {
    id: requiredString(record, "id"),
    email: requiredString(record, "email"),
    name: requiredString(record, "name"),
    createdAt: requiredString(record, "createdAt"),
    updatedAt: requiredString(record, "updatedAt"),
  };
}

export function parseAuthLoginResponse(value: unknown): AuthLoginResponse {
  const record = parseRecord(value);
  return { user: parseUser(record.user) };
}

export function parseAuthRegisterResponse(value: unknown): AuthRegisterResponse {
  const record = parseRecord(value);
  return { message: requiredString(record, "message") };
}

export function parseMeResponse(value: unknown): MeResponse {
  const record = parseRecord(value);
  return { user: parseUser(record.user) };
}
