import { findUserCredentialsByEmail } from "../users/users.repository.ts";
import { UnauthorizedException } from "../../shared/errors/app-error.ts";
import { comparePassword, DUMMY_PASSWORD_HASH } from "../../shared/utils/bcrypt.ts";
import { signAccessToken } from "../../shared/utils/jwt.ts";
import type { User } from "../users/users.types.ts";

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: User; accessToken: string }> {
  const credentials = await findUserCredentialsByEmail(input.email);
  const passwordHash = credentials?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const matches = await comparePassword(input.password, passwordHash);

  if (!credentials || !matches) {
    throw new UnauthorizedException("Invalid email or password");
  }

  const accessToken = await signAccessToken(credentials.user.id);
  return { user: credentials.user, accessToken };
}
