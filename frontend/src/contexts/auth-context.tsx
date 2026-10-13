import { useContext } from "react";
import type { User } from "@/types/user.ts";
import {
  AuthActionsContext,
  AuthReadyContext,
  AuthSessionErrorContext,
  AuthUserContext,
  readAuthContext,
} from "./auth-context-store.ts";
import type { AuthContextValue, AuthState } from "./auth-types.ts";

export type { AuthActions, AuthContextValue, AuthState } from "./auth-types.ts";

export function useAuthReady(): boolean {
  return readAuthContext(
    AuthReadyContext,
    "useAuthReady",
    useContext(AuthReadyContext),
  );
}

export function useAuthUser(): User | null {
  return readAuthContext(
    AuthUserContext,
    "useAuthUser",
    useContext(AuthUserContext),
  );
}

/** For routes behind `ProtectedRoute` / `MainLayout` where `user` is guaranteed. */
export function useAuthenticatedUser(): User {
  const user = useAuthUser();
  if (!user) {
    throw new Error("useAuthenticatedUser requires an authenticated session");
  }
  return user;
}

export function useAuthSessionError(): string | null {
  return readAuthContext(
    AuthSessionErrorContext,
    "useAuthSessionError",
    useContext(AuthSessionErrorContext),
  );
}

/** Subscribes to all session fields; prefer granular hooks when possible. */
export function useAuthState(): AuthState {
  return {
    user: useAuthUser(),
    ready: useAuthReady(),
    sessionError: useAuthSessionError(),
  };
}

export function useAuthActions() {
  return readAuthContext(
    AuthActionsContext,
    "useAuthActions",
    useContext(AuthActionsContext),
  );
}

export function useAuth(): AuthContextValue {
  return { ...useAuthState(), ...useAuthActions() };
}
