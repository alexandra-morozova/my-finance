import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "@/services/auth.ts";
import type { LoginInput, RegisterInput } from "@/types/auth.ts";
import type { User } from "@/types/user.ts";
import {
  AuthActionsContext,
  AuthReadyContext,
  AuthSessionErrorContext,
  AuthUserContext,
} from "./auth-context-store.ts";
import type { AuthActions } from "./auth-types.ts";
import { bootstrapSession, SESSION_CHECK_FAILED } from "./sessionBootstrap.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void bootstrapSession()
      .then(({ user, sessionError: bootstrapError }) => {
        if (cancelled) {
          return;
        }
        setUser(user);
        setSessionError(bootstrapError);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        console.error(error);
        setUser(null);
        setSessionError(SESSION_CHECK_FAILED);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const nextUser = await loginRequest(input);
    setSessionError(null);
    setUser(nextUser);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    return registerRequest(input);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setSessionError(null);
    setUser(null);
  }, []);

  const actions = useMemo<AuthActions>(
    () => ({ login, register, logout }),
    [login, register, logout],
  );

  return (
    <AuthReadyContext.Provider value={ready}>
      <AuthUserContext.Provider value={user}>
        <AuthSessionErrorContext.Provider value={sessionError}>
          <AuthActionsContext.Provider value={actions}>
            {children}
          </AuthActionsContext.Provider>
        </AuthSessionErrorContext.Provider>
      </AuthUserContext.Provider>
    </AuthReadyContext.Provider>
  );
}
