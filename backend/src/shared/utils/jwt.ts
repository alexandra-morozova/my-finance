import { jwtVerify, SignJWT } from "jose";
import { env } from "../env.ts";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const algorithms = ["HS256"] as const;

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: [...algorithms],
  });
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid token payload");
  }
  return payload.sub;
}
