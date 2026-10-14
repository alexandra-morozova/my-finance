import { describe, expect, it } from "vitest";
import {
  decodeListKeyset,
  encodeListKeyset,
} from "../../src/modules/transaction/transaction.pagination.ts";

const VALID_TX_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("decodeListKeyset", () => {
  it("returns null instead of throwing on malformed input", () => {
    expect(decodeListKeyset("")).toBeNull();
    expect(decodeListKeyset("   ")).toBeNull();
    expect(decodeListKeyset("no-pipe")).toBeNull();
    expect(decodeListKeyset("|only-id")).toBeNull();
    expect(decodeListKeyset("2025-06-01T00:00:00.000Z|")).toBeNull();
    expect(decodeListKeyset("2025-06-01|550e8400-e29b-41d4-a716-446655440000")).toBeNull();
    expect(decodeListKeyset("a|b|c")).toBeNull();
    expect(decodeListKeyset("x".repeat(200))).toBeNull();
  });

  it("round-trips encoded keyset tokens", () => {
    const token = encodeListKeyset(new Date("2025-06-01T00:00:00.000Z"), VALID_TX_ID);
    expect(decodeListKeyset(token)).toEqual({
      date: new Date("2025-06-01T00:00:00.000Z"),
      transactionId: VALID_TX_ID,
    });
  });
});
