import type { Rule } from "antd/es/form";

// Keep in sync with backend `shared/validation/fields.ts` (parseEmail, parsePassword, parseName).

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
export const EMAIL_MAX_LENGTH = 254;

export const nameFieldRules: Rule[] = [
  { required: true, message: "Name is required" },
];

export const emailFieldRules: Rule[] = [
  { required: true, message: "Email is required" },
  { type: "email", message: "Email is invalid" },
  { max: EMAIL_MAX_LENGTH, message: "Email is invalid" },
];

/** Same normalization as backend parseEmail before auth API calls. */
export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeAuthName(raw: string): string {
  return raw.trim();
}

export const passwordFieldRules: Rule[] = [
  { required: true, message: "Password is required" },
  {
    min: PASSWORD_MIN_LENGTH,
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  },
  {
    max: PASSWORD_MAX_LENGTH,
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  },
];
