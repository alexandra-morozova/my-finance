import { describe, expect, it } from "vitest";
import { AppError } from "../../src/shared/errors/app-error.ts";
import { parseCurrencyCode } from "../../src/shared/validation/currency.ts";

describe("parseCurrencyCode", () => {
  it("normalizes supported codes to uppercase", () => {
    expect(parseCurrencyCode("eur")).toBe("EUR");
    expect(parseCurrencyCode(" usd ")).toBe("USD");
  });

  it("rejects malformed codes", () => {
    expect(() => parseCurrencyCode(undefined)).toThrow(AppError);
    expect(() => parseCurrencyCode(["EUR"])).toThrow(AppError);
    expect(() => parseCurrencyCode("EURO")).toThrow(AppError);
  });

  it("rejects valid-format but unsupported codes", () => {
    expect(() => parseCurrencyCode("XXX")).toThrow(AppError);
  });
});
