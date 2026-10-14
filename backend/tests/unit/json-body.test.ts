import { describe, expect, it } from "vitest";
import { AppError } from "../../src/shared/errors/app-error.ts";
import { parseJsonObjectBody } from "../../src/shared/validation/json-body.ts";

describe("parseJsonObjectBody", () => {
  it("accepts plain objects", () => {
    expect(parseJsonObjectBody({ name: "x" })).toEqual({ name: "x" });
  });

  it("rejects missing or non-object bodies", () => {
    for (const value of [undefined, null, [], "text", 1]) {
      expect(() => parseJsonObjectBody(value)).toThrow(AppError);
    }
  });
});
