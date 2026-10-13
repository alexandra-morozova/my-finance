import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api.ts";
import type { User } from "@/types/user.ts";

vi.mock("@/services/users.ts", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/services/users.ts";
import { bootstrapSession, SESSION_CHECK_FAILED } from "./sessionBootstrap.ts";

const user: User = {
  id: "u1",
  email: "a@b.co",
  name: "Ada",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("bootstrapSession", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns user when session is valid", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    await expect(bootstrapSession()).resolves.toEqual({
      user,
      sessionError: null,
    });
  });

  it("returns no error for 401", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new ApiError(401, "Unauthorized"));
    await expect(bootstrapSession()).resolves.toEqual({
      user: null,
      sessionError: null,
    });
  });

  it("returns session error for other failures", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new ApiError(503, "Unavailable"));
    await expect(bootstrapSession()).resolves.toEqual({
      user: null,
      sessionError: "Unavailable",
    });
  });

  it("uses fallback message for unknown errors", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("network"));
    await expect(bootstrapSession()).resolves.toEqual({
      user: null,
      sessionError: SESSION_CHECK_FAILED,
    });
  });
});
