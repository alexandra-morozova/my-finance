import { AppError, NotFoundException } from "../../shared/errors/app-error.ts";
import { hashPassword } from "../../shared/utils/bcrypt.ts";
import { HTTP_STATUS } from "../../shared/utils/http-status.ts";
import {
  createUser,
  findUserByEmail,
  updateUserPassword,
} from "./users.repository.ts";
import type { User } from "./users.types.ts";

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<User> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Email already registered");
  }

  const passwordHash = await hashPassword(input.password);
  return createUser({
    email: input.email,
    passwordHash,
    name: input.name,
  });
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const updated = await updateUserPassword(userId, passwordHash);
  if (!updated) {
    throw new NotFoundException("User not found");
  }
}
