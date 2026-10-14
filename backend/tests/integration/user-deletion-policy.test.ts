import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  AccountType,
  Prisma,
  TransactionSource,
} from "../../generated/prisma/client.ts";
import { prisma } from "../../src/database/prisma.ts";

function uniqueEmail(): string {
  return `deletion-policy-${randomUUID()}@example.test`;
}

async function createBareUser() {
  return prisma.user.create({
    data: {
      email: uniqueEmail(),
      passwordHash: "test-hash",
      name: "Deletion policy test",
    },
  });
}

async function createUserWithAccount() {
  const user = await createBareUser();
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Checking",
      currency: "EUR",
      type: AccountType.CHECKING,
    },
  });
  return { user, account };
}

async function createUserWithLedger() {
  const { user, account } = await createUserWithAccount();
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: new Prisma.Decimal("-10.00"),
      currency: "EUR",
      date: new Date("2025-06-01"),
      source: TransactionSource.MANUAL,
    },
  });
  return { user, account, transaction };
}

async function purgeFinancialData(userId: string): Promise<void> {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
}

describe("financial deletion policy (Postgres RESTRICT)", () => {
  const userIdsToPurge: string[] = [];

  afterEach(async () => {
    while (userIdsToPurge.length > 0) {
      const userId = userIdsToPurge.pop();
      if (!userId) {
        continue;
      }
      await purgeFinancialData(userId).catch(() => undefined);
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it("allows hard-delete user with no accounts or transactions", async () => {
    const user = await createBareUser();
    await expect(prisma.user.delete({ where: { id: user.id } })).resolves.toBeDefined();
  });

  it("rejects hard-delete user while an account exists", async () => {
    const { user } = await createUserWithAccount();
    userIdsToPurge.push(user.id);

    await expect(prisma.user.delete({ where: { id: user.id } })).rejects.toMatchObject({
      code: "P2003",
    });
  });

  it("rejects hard-delete user while a transaction exists", async () => {
    const { user } = await createUserWithLedger();
    userIdsToPurge.push(user.id);

    await expect(prisma.user.delete({ where: { id: user.id } })).rejects.toMatchObject({
      code: "P2003",
    });
  });

  it("rejects hard-delete account while transactions reference it", async () => {
    const { user, account } = await createUserWithLedger();
    userIdsToPurge.push(user.id);

    await expect(prisma.account.delete({ where: { id: account.id } })).rejects.toMatchObject({
      code: "P2003",
    });
  });

  it("allows hard-delete user after financial rows are removed explicitly", async () => {
    const { user } = await createUserWithLedger();
    await purgeFinancialData(user.id);
    await expect(prisma.user.delete({ where: { id: user.id } })).resolves.toBeDefined();
  });
});
