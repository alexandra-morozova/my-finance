import { describe, expect, it } from "vitest";
import { ApiError } from "./api.ts";
import { parseAuthRegisterResponse, parseUser } from "./api-parse.ts";

describe("parseUser", () => {
  it("parses a valid user", () => {
    expect(
      parseUser({
        id: "u1",
        email: "a@b.co",
        name: "Ada",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).toEqual({
      id: "u1",
      email: "a@b.co",
      name: "Ada",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("throws ApiError for invalid payload", () => {
    expect(() => parseUser({ id: 1 })).toThrow(ApiError);
  });
});

describe("parseAuthRegisterResponse", () => {
  it("parses message", () => {
    expect(parseAuthRegisterResponse({ message: "Check your email" })).toEqual({
      message: "Check your email",
    });
  });
});
