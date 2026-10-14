import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  AccountType,
  Prisma,
  TransactionSource,
} from "../../generated/prisma/client.ts";
import { prisma } from "../../src/database/prisma.ts";
import { encodeListKeyset } from "../../src/modules/transaction/transaction.pagination.ts";
import { listTransactions } from "../../src/modules/transaction/transaction.repository.ts";
import { getTransactionsForUser } from "../../src/modules/transaction/transaction.service.ts";

const SAME_DATE = new Date("2025-04-10T00:00:00.000Z");

/** Lexicographic ids so DESC order is TX_C > TX_B > TX_A. */
const TX_A = "550e8400-e29b-41d4-a716-446655440001";
const TX_B = "550e8400-e29b-41d4-a716-446655440002";
const TX_C = "550e8400-e29b-41d4-a716-446655440003";

async function createUserWithSameDateTransactions() {
  const user = await prisma.user.create({
    data: {
      email: `keyset-${randomUUID()}@example.test`,
      passwordHash: "test-hash",
      name: "Keyset test",
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

  for (const [id, amount] of [
    [TX_A, "1.00"],
    [TX_B, "2.00"],
    [TX_C, "3.00"],
  ] as const) {
    await prisma.transaction.create({
      data: {
        id,
        userId: user.id,
        accountId: account.id,
        amount: new Prisma.Decimal(amount),
        currency: "EUR",
        date: SAME_DATE,
        source: TransactionSource.MANUAL,
      },
    });
  }

  return { user, account };
}

async function purgeUser(userId: string): Promise<void> {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

describe("transaction keyset pagination (date desc, id desc)", () => {
  let userId: string | undefined;

  afterEach(async () => {
    if (userId) {
      await purgeUser(userId).catch(() => undefined);
      userId = undefined;
    }
  });

  it("pages through rows that share the same @db.Date using id as tie-breaker", async () => {
    const { user } = await createUserWithSameDateTransactions();
    userId = user.id;

    const page1 = await getTransactionsForUser({ userId, limit: 2 });
    expect(page1.items.map((t) => t.id)).toEqual([TX_C, TX_B]);
    expect(page1.nextCursor).toBe(encodeListKeyset(SAME_DATE, TX_B));

    const page2 = await getTransactionsForUser({
      userId,
      limit: 2,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.items.map((t) => t.id)).toEqual([TX_A]);
    expect(page2.nextCursor).toBeNull();
  });

  it("repository returns at most limit rows while using limit+1 only to set hasMore", async () => {
    const { user } = await createUserWithSameDateTransactions();
    userId = user.id;

    const page = await listTransactions({ userId: user.id, limit: 2 });
    expect(page.rows).toHaveLength(2);
    expect(page.rows.length).toBeLessThanOrEqual(2);
    expect(page.hasMore).toBe(true);
  });

  it("walks every page once with no duplicates or skipped ids", async () => {
    const { user, account } = await createUserWithSameDateTransactions();
    userId = user.id;

    const extraIds = [
      "550e8400-e29b-41d4-a716-446655440010",
      "550e8400-e29b-41d4-a716-446655440011",
    ] as const;
    for (const [index, id] of extraIds.entries()) {
      await prisma.transaction.create({
        data: {
          id,
          userId: user.id,
          accountId: account.id,
          amount: new Prisma.Decimal(String(index + 10)),
          currency: "EUR",
          date: new Date(`2025-04-0${9 - index}T00:00:00.000Z`),
          source: TransactionSource.MANUAL,
        },
      });
    }

    const expected = new Set([TX_A, TX_B, TX_C, ...extraIds]);
    const seen: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await getTransactionsForUser({ userId: user.id, limit: 2, cursor });
      expect(page.items.length).toBeLessThanOrEqual(2);
      for (const item of page.items) {
        seen.push(item.id);
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);

    expect(new Set(seen).size).toBe(seen.length);
    expect(new Set(seen)).toEqual(expected);
  });

  it("includes older calendar dates on the next page", async () => {
    const { user, account } = await createUserWithSameDateTransactions();
    userId = user.id;

    const olderId = "550e8400-e29b-41d4-a716-446655440010";
    await prisma.transaction.create({
      data: {
        id: olderId,
        userId: user.id,
        accountId: account.id,
        amount: new Prisma.Decimal("9.00"),
        currency: "EUR",
        date: new Date("2025-04-09T00:00:00.000Z"),
        source: TransactionSource.MANUAL,
      },
    });

    const page1 = await getTransactionsForUser({ userId, limit: 3 });
    expect(page1.items.map((t) => t.id)).toEqual([TX_C, TX_B, TX_A]);

    const page2 = await getTransactionsForUser({
      userId,
      limit: 3,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.items.map((t) => t.id)).toEqual([olderId]);
  });
});
