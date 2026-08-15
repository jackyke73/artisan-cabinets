import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

const KEY = "APP_ENCRYPTION_KEY";
afterEach(() => {
  delete process.env[KEY];
});

describe("secret encryption", () => {
  it("round-trips a value when a key is set", () => {
    process.env[KEY] = "test-encryption-key-please-change";
    const secret = "xoxp-1AMo2x666usWSHWo1jP8STIMsdVwFdTXflf8IYpR";
    const enc = encryptSecret(secret);
    expect(enc).not.toBe(secret);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("produces different ciphertext each time (random IV)", () => {
    process.env[KEY] = "k";
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("is a no-op when no key is set (dev convenience)", () => {
    const secret = "plaintext-token";
    expect(encryptSecret(secret)).toBe(secret);
    expect(decryptSecret(secret)).toBe(secret);
  });

  it("passes through legacy plaintext values on decrypt", () => {
    process.env[KEY] = "k";
    expect(decryptSecret("legacy-plaintext-token")).toBe("legacy-plaintext-token");
  });

  it("throws if asked to decrypt without the key that made it", () => {
    process.env[KEY] = "k";
    const enc = encryptSecret("secret");
    delete process.env[KEY];
    expect(() => decryptSecret(enc)).toThrow(/APP_ENCRYPTION_KEY/);
  });
});
