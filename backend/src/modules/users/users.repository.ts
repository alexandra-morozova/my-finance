import { Prisma } from "../../../generated/prisma/client.ts";
import { prisma } from "../../database/prisma.ts";
import { EmailTakenError } from "./users.errors.ts";
import type { NewUser, User } from "./users.types.ts";

const userSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createUser(input: NewUser): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        name: input.name,
      },
      select: userSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new EmailTakenError();
    }
    throw err;
  }
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: userSelect,
  });
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });
  return true;
}

export async function findUserCredentialsByEmail(
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  const row = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { ...userSelect, passwordHash: true },
  });
  if (!row) {
    return null;
  }
  const { passwordHash, ...user } = row;
  return { user, passwordHash };
}
