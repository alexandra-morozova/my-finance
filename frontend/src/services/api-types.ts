import type { User } from "@/types/user.ts";

export type AuthLoginResponse = {
  user: User;
};

export type AuthRegisterResponse = {
  message: string;
};

export type MeResponse = {
  user: User;
};
