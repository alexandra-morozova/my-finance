import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** Timing Oracle protection - Same cost as real hashes so login compares take similar time when the email is unknown.  */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-oracle-dummy-password", ROUNDS);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function comparePassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
