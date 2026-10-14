import { createHash, randomBytes } from "node:crypto";

export function randomBase64Url(byteLength: number): string {
  return randomBytes(byteLength).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
