import type { NewUser, User } from "../domain/user.ts";
import { prisma } from "../config/db.config.ts";

const userSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createUser(input: NewUser): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
    },
    select: userSelect,
  });
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
