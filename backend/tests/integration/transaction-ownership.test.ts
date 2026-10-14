import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  AccountType,
  Prisma,
  TransactionSource,
} from "../../generated/prisma/client.ts";
import { prisma } from "../../src/database/prisma.ts";
import {
  getTransactionForUser,
  getTransactionsForUser,
} from "../../src/modules/transaction/transaction.service.ts";
import { assertAccountOwned } from "../../src/modules/accounts/accounts.service.ts";
import { NotFoundException } from "../../src/shared/errors/app-error.ts";

function uniqueEmail(): string {
  return `tx-ownership-${randomUUID()}@example.test`;
}

async function createUserWithTransaction() {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail(),
      passwordHash: "test-hash",
      name: "Tx ownership test",
    },
  });
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Checking",
      currency: "EUR",
      type: AccountType.CHECKING,
    },
  });
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: new Prisma.Decimal("42.00"),
      currency: "EUR",
      date: new Date("2025-03-15"),
      source: TransactionSource.MANUAL,
      memo: "visible to owner only",
    },
  });
  return { user, account, transaction };
}

async function purgeUser(userId: string): Promise<void> {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

describe("transaction ownership (service + database)", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    while (userIds.length > 0) {
      const id = userIds.pop();
      if (id) {
        await purgeUser(id).catch(() => undefined);
      }
    }
  });

  it("returns only the authenticated user's transactions in list", async () => {
    const owner = await createUserWithTransaction();
    const other = await createUserWithTransaction();
    userIds.push(owner.user.id, other.user.id);

    const ownerList = await getTransactionsForUser({ userId: owner.user.id });
    expect(ownerList.items).toHaveLength(1);
    expect(ownerList.items[0]?.id).toBe(owner.transaction.id);

    const otherList = await getTransactionsForUser({ userId: other.user.id });
    expect(otherList.items).toHaveLength(1);
    expect(otherList.items[0]?.id).toBe(other.transaction.id);
    expect(otherList.items[0]?.id).not.toBe(owner.transaction.id);
  });

  it("rejects get-by-id when the transaction belongs to another user", async () => {
    const owner = await createUserWithTransaction();
    const other = await createUserWithTransaction();
    userIds.push(owner.user.id, other.user.id);

    await expect(
      getTransactionForUser(other.user.id, owner.transaction.id),
    ).rejects.toBeInstanceOf(NotFoundException);

    const row = await getTransactionForUser(owner.user.id, owner.transaction.id);
    expect(row.id).toBe(owner.transaction.id);
    expect(row.amount).toBe("42");
    expect(row.memo).toBe("visible to owner only");
  });

  it("rejects list filter accountId that belongs to another user", async () => {
    const owner = await createUserWithTransaction();
    const other = await createUserWithTransaction();
    userIds.push(owner.user.id, other.user.id);

    await expect(assertAccountOwned(other.user.id, owner.account.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("excludes soft-deleted transactions from list and get", async () => {
    const { user, transaction } = await createUserWithTransaction();
    userIds.push(user.id);

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { deletedAt: new Date() },
    });

    const list = await getTransactionsForUser({ userId: user.id });
    expect(list.items).toHaveLength(0);

    await expect(getTransactionForUser(user.id, transaction.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
