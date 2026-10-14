import type { AccountType } from "../../../generated/prisma/client.ts";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NewAccount = {
  name: string;
  type: AccountType;
  currency: string;
};
