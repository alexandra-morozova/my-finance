import { AppError } from "../errors/app-error.ts";
import { HTTP_STATUS } from "../utils/http-status.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Email is invalid");
  }
  return email;
}

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 72;

export function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Password is required");
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    );
  }
  return value;
}

export function parseName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Name is required");
  }
  return name;
}
