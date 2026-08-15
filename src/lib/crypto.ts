import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// At-rest encryption for stored secrets (QuickBooks tokens). Uses AES-256-GCM
// with a key derived from APP_ENCRYPTION_KEY. When that env var is unset,
// encryption is a no-op (plaintext) so local dev works without extra setup —
// set APP_ENCRYPTION_KEY in production to turn it on.

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) return null;
  // Normalize any-length secret to 32 bytes.
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a secret for storage. Returns plaintext unchanged when no key is set. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt a stored secret. Passes through values that aren't encrypted (legacy/dev). */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) throw new Error("APP_ENCRYPTION_KEY is required to decrypt stored tokens.");
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
