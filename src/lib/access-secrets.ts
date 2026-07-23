import "server-only";

import crypto from "node:crypto";

/**
 * Application-layer encryption for property access secrets (gate/garage/lockbox
 * details). AES-256-GCM with a key from ACCESS_SECRETS_KEY (base64, 32 bytes).
 * Secrets are encrypted before they touch the database and are never logged.
 */

function getKey(): Buffer {
  const raw = process.env.ACCESS_SECRETS_KEY;
  if (!raw) {
    throw new Error("ACCESS_SECRETS_KEY is not configured.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ACCESS_SECRETS_KEY must be 32 bytes, base64-encoded.");
  }
  return key;
}

export function encryptAccessSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptAccessSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unrecognized access-secret payload format.");
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
