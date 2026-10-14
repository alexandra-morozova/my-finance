import { prisma } from "../../database/prisma.ts";
import type { Account, NewAccount } from "./accounts.types.ts";

const accountSelect = {
  id: true,
  name: true,
  type: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listAccountsByUserId(userId: string): Promise<Account[]> {
  return prisma.account.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: accountSelect,
  });
}

export async function createAccount(userId: string, input: NewAccount): Promise<Account> {
  return prisma.account.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
    },
    select: accountSelect,
  });
}

export async function findAccountByIdForUser(
  userId: string,
  accountId: string,
): Promise<Account | null> {
  return prisma.account.findFirst({
    where: { id: accountId, userId },
    select: accountSelect,
  });
}
