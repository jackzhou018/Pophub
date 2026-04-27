import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

const MIN_PRODUCTION_SECRET_LENGTH = 32;

function requireSessionSecret() {
  const secret = process.env.POPHUB_SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing POPHUB_SESSION_SECRET");
  }

  if (
    process.env.NODE_ENV === "production" &&
    secret.length < MIN_PRODUCTION_SECRET_LENGTH
  ) {
    throw new Error(
      `POPHUB_SESSION_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encrypt(value: string) {
  const key = requireSessionSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decrypt(value: string) {
  const key = requireSessionSecret();
  const buffer = Buffer.from(value, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);

  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPasswordHash(password: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  );

  return timingSafeEqual(actual, expected);
}
