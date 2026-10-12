import { jwtVerify, SignJWT } from "jose";
import { env } from "../env.ts";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid token payload");
  }
  return payload.sub;
}
