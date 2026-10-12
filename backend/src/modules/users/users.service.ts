import { NotFoundException, UnauthorizedException } from "../../shared/errors/app-error.ts";
import { hashPassword } from "../../shared/utils/bcrypt.ts";
import { EmailTakenError } from "./users.errors.ts";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
} from "./users.repository.ts";
import type { User } from "./users.types.ts";

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<void> {
  const [passwordHash, existing] = await Promise.all([
    hashPassword(input.password),
    findUserByEmail(input.email),
  ]);
  if (existing) {
    return;
  }

  try {
    await createUser({
      email: input.email,
      passwordHash,
      name: input.name,
    });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return;
    }
    throw err;
  }
}

export async function getCurrentUser(userId: string): Promise<User> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedException();
  }
  return user;
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const updated = await updateUserPassword(userId, passwordHash);
  if (!updated) {
    throw new NotFoundException("User not found");
  }
}
