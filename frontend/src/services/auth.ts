import type { LoginInput, RegisterInput } from "@/types/auth.ts";
import type { User } from "@/types/user.ts";
import { api } from "./api.ts";
import {
  parseAuthLoginResponse,
  parseAuthRegisterResponse,
} from "./api-parse.ts";
import { apiPaths } from "./paths.ts";

export type { LoginInput, RegisterInput };

export async function login(input: LoginInput): Promise<User> {
  const body = await api(apiPaths.authLogin, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseAuthLoginResponse(body).user;
}

export async function register(input: RegisterInput): Promise<string> {
  const body = await api(apiPaths.authRegister, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseAuthRegisterResponse(body).message;
}

/** Clears the server session. Backend route not implemented yet — see stub body. */
export async function logout(): Promise<void> {
  // TODO: when POST /auth/logout exists, clear the httpOnly cookie on the server:
  // await api(apiPaths.authLogout, { method: "POST" });
  //
  // Stub: no network call. AuthProvider still clears client user state so the UI
  // treats the user as signed out; a full page reload may restore the session
  // until the backend logout endpoint is wired up here.
}
