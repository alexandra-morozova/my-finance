import { describe, expect, it } from "vitest";
import { AppError } from "../../src/shared/errors/app-error.ts";
import { encodeListKeyset } from "../../src/modules/transaction/transaction.pagination.ts";
import {
  parseOptionalLimit,
  resolveListLimit,
} from "../../src/modules/transaction/transaction.list-limit.ts";
import {
  parseListTransactionsQuery,
  parseOptionalListCursor,
} from "../../src/modules/transaction/transaction.list-query.ts";

const VALID_TX_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("parseOptionalLimit", () => {
  it("accepts valid integers in range", () => {
    expect(parseOptionalLimit(undefined)).toBeUndefined();
    expect(parseOptionalLimit("")).toBeUndefined();
    expect(parseOptionalLimit("10")).toBe(10);
    expect(parseOptionalLimit("1")).toBe(1);
    expect(parseOptionalLimit("100")).toBe(100);
  });

  it("rejects malformed or out-of-range values", () => {
    const cases = ["10abc", "1.5", "1e2", "101", "0", "-1", " 10", "10 ", "010"];
    for (const value of cases) {
      expect(() => parseOptionalLimit(value)).toThrow(AppError);
    }
    expect(() => parseOptionalLimit(["5"])).toThrow(AppError);
    expect(() => parseOptionalLimit(10)).toThrow(AppError);
  });
});

describe("resolveListLimit", () => {
  it("defaults when omitted", () => {
    expect(resolveListLimit(undefined)).toBe(50);
  });

  it("accepts integers in range", () => {
    expect(resolveListLimit(1)).toBe(1);
    expect(resolveListLimit(100)).toBe(100);
  });

  it("rejects non-integers and out-of-range values", () => {
    for (const value of [NaN, Infinity, -Infinity, 1.5, 0, 101, -1]) {
      expect(() => resolveListLimit(value)).toThrow(AppError);
    }
  });
});

describe("parseOptionalListCursor", () => {
  it("accepts compound date|transactionId cursor", () => {
    const cursor = encodeListKeyset(new Date("2025-06-01T00:00:00.000Z"), VALID_TX_ID);
    expect(parseOptionalListCursor(cursor)).toBe(cursor);
  });

  it("rejects invalid cursor shapes and transaction ids", () => {
    expect(() => parseOptionalListCursor("not-a-cursor")).toThrow(AppError);
    expect(() =>
      parseOptionalListCursor("2025-06-01T00:00:00.000Z|not-a-uuid"),
    ).toThrow(AppError);
    expect(() => parseOptionalListCursor(["x|y"])).toThrow(AppError);
    expect(() =>
      parseOptionalListCursor(" 2025-06-01T00:00:00.000Z|550e8400-e29b-41d4-a716-446655440000"),
    ).toThrow(AppError);
  });
});

describe("parseListTransactionsQuery", () => {
  it("throws on malformed limit before any accountId would be used", () => {
    expect(() =>
      parseListTransactionsQuery({
        limit: "10abc",
        accountId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow(AppError);
  });
});
