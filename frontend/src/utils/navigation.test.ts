import { describe, expect, it } from "vitest";
import { getPostLoginPath, getRouteNotice } from "./navigation.ts";

describe("getRouteNotice", () => {
  it("returns notice string from location state", () => {
    expect(getRouteNotice({ notice: "Account created" })).toBe("Account created");
  });

  it("returns null for invalid state", () => {
    expect(getRouteNotice(null)).toBeNull();
    expect(getRouteNotice({ foo: "bar" })).toBeNull();
  });
});

describe("getPostLoginPath", () => {
  it("returns home when state is missing", () => {
    expect(getPostLoginPath(undefined)).toBe("/");
  });

  it("returns internal path from location state", () => {
    expect(
      getPostLoginPath({
        from: { pathname: "/settings", search: "?tab=1", hash: "#x" },
      }),
    ).toBe("/settings?tab=1#x");
  });

  it("rejects external and auth paths", () => {
    expect(getPostLoginPath({ from: { pathname: "//evil.com" } })).toBe("/");
    expect(getPostLoginPath({ from: { pathname: "/login" } })).toBe("/");
    expect(getPostLoginPath({ from: { pathname: "/register" } })).toBe("/");
  });
});
