import { NotFoundException } from "../../shared/errors/app-error.ts";
import {
  createAccount,
  findAccountByIdForUser,
  listAccountsByUserId,
} from "./accounts.repository.ts";
import type { Account, NewAccount } from "./accounts.types.ts";

export async function getAccountsForUser(userId: string): Promise<Account[]> {
  return listAccountsByUserId(userId);
}

export async function createAccountForUser(userId: string, input: NewAccount): Promise<Account> {
  return createAccount(userId, input);
}

export async function assertAccountOwned(userId: string, accountId: string): Promise<Account> {
  const account = await findAccountByIdForUser(userId, accountId);
  if (!account) {
    throw new NotFoundException("Account not found");
  }
  return account;
}
