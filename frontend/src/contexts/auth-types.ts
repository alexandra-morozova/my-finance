import type { LoginInput, RegisterInput } from "@/types/auth.ts";
import type { User } from "@/types/user.ts";

export type AuthState = {
  user: User | null;
  ready: boolean;
  sessionError: string | null;
};

export type AuthActions = {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<string>;
  logout: () => Promise<void>;
};

export type AuthContextValue = AuthState & AuthActions;
