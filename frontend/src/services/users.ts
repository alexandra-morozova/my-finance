import type { User } from "@/types/user.ts";
import { api } from "./api.ts";
import { parseMeResponse } from "./api-parse.ts";
import { apiPaths } from "./paths.ts";

export type { User };

export async function getCurrentUser(): Promise<User> {
  const body = await api(apiPaths.usersMe);
  return parseMeResponse(body).user;
}
