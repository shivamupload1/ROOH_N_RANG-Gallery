import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function normalizeEnvValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/^['"]|['"]$/g, "");
}

function encryptionKey() {
  const raw = normalizeEnvValue(process.env.TOKEN_ENCRYPTION_KEY);

  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required for Google token encryption.");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a base64 encoded 32 byte key.");
  }

  return key;
}

export function encrypt(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split(".");

  if (!iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted token format.");
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
