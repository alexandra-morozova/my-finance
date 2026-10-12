import type { NewUser, User } from "../domain/user.ts";
import { UserModel, type UserDoc } from "../models/user.model.ts";

function toUser(doc: UserDoc): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createUser(input: NewUser): Promise<User> {
  const doc = await UserModel.create({
    email: input.email,
    password: input.passwordHash,
    name: input.name,
  });
  return toUser(doc);
}

export async function findUserById(id: string): Promise<User | null> {
  const doc = await UserModel.findById(id);
  return doc ? toUser(doc) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const doc = await UserModel.findOne({ email: email.toLowerCase() });
  return doc ? toUser(doc) : null;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
  const doc = await UserModel.findByIdAndUpdate(id, { password: passwordHash });
  return doc !== null;
}

export async function findUserCredentialsByEmail(
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  const doc = await UserModel.findOne({ email: email.toLowerCase() }).select("+password");
  if (!doc) {
    return null;
  }
  return { user: toUser(doc), passwordHash: doc.password };
}
