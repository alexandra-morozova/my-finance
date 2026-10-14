import { AppError } from "../errors/app-error.ts";
import { HTTP_STATUS } from "../utils/http-status.ts";

const CURRENCY_CODE = /^[A-Z]{3}$/;

/** v1 supported ISO 4217 codes for accounts and transactions. */
export const SUPPORTED_CURRENCY_CODES = new Set<string>([
  "AUD",
  "CAD",
  "CHF",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HUF",
  "JPY",
  "NOK",
  "NZD",
  "PLN",
  "RON",
  "SEK",
  "USD",
]);

export function parseCurrencyCode(value: unknown): string {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!CURRENCY_CODE.test(currency)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Currency must be a 3-letter ISO 4217 code");
  }
  if (!SUPPORTED_CURRENCY_CODES.has(currency)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Currency is not supported");
  }
  return currency;
}
