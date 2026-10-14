import type { Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../database/prisma.ts";
import { InvalidOrConsumedVerificationTokenError } from "./auth.errors.ts";

type DbClient = Prisma.TransactionClient | typeof prisma;
type Transaction = Prisma.TransactionClient;

export async function insertEmailVerificationToken(
  input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  },
  db: DbClient = prisma,
): Promise<void> {
  await db.emailVerificationToken.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    },
  });
}

export async function deleteUnusedEmailVerificationTokensForUser(
  userId: string,
  db: DbClient = prisma,
): Promise<void> {
  await db.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });
}

export async function replaceEmailVerificationTokenForUser(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await deleteUnusedEmailVerificationTokensForUser(input.userId, tx);
    await insertEmailVerificationToken(
      {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
      tx,
    );
  });
}

export type ClaimEmailVerificationResult = {
  userId: string;
};

export async function claimEmailVerificationTokenAndVerifyUser(
  tokenHash: string,
): Promise<ClaimEmailVerificationResult> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const userId = await markTokenUsedAndGetUserId(tx, tokenHash, now);
    await ensureUserEmailVerified(tx, userId, now);
    return { userId };
  });
}

async function markTokenUsedAndGetUserId(
  tx: Transaction,
  tokenHash: string,
  now: Date,
): Promise<string> {
  const claim = await tx.emailVerificationToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (claim.count !== 1) {
    throw new InvalidOrConsumedVerificationTokenError();
  }

  const row = await tx.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });
  if (!row) {
    throw new InvalidOrConsumedVerificationTokenError();
  }

  return row.userId;
}

async function ensureUserEmailVerified(
  tx: Transaction,
  userId: string,
  now: Date,
): Promise<void> {
  const updated = await tx.user.updateMany({
    where: { id: userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: now },
  });
  if (updated.count === 1) {
    return;
  }

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  });
  if (user?.emailVerifiedAt != null) {
    return;
  }

  throw new InvalidOrConsumedVerificationTokenError();
}
