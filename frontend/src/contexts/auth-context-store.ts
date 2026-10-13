import { createContext, type Context } from "react";
import type { AuthActions } from "./auth-types.ts";
import type { User } from "@/types/user.ts";

const missingProvider = Symbol("missingProvider");

type AuthReadyValue = boolean | typeof missingProvider;
type AuthUserValue = User | null | typeof missingProvider;
type AuthSessionErrorValue = string | null | typeof missingProvider;
type AuthActionsValue = AuthActions | typeof missingProvider;

/** @internal For `AuthProvider` and auth hooks only — do not import outside `contexts/`. */
export const AuthReadyContext = createContext<AuthReadyValue>(missingProvider);
/** @internal */
export const AuthUserContext = createContext<AuthUserValue>(missingProvider);
/** @internal */
export const AuthSessionErrorContext =
  createContext<AuthSessionErrorValue>(missingProvider);
/** @internal */
export const AuthActionsContext =
  createContext<AuthActionsValue>(missingProvider);

export function readAuthContext<T>(
  _context: Context<T | typeof missingProvider>,
  hookName: string,
  value: T | typeof missingProvider,
): T {
  if (value === missingProvider) {
    throw new Error(`${hookName} must be used within AuthProvider`);
  }
  return value;
}
