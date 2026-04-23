import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createPasswordHash, createSessionToken, hashSessionToken, verifyPasswordHash } from "@/lib/security";
import { execute, queryOne } from "@/lib/db";

type StoredUser = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

const SESSION_COOKIE_NAME = "pophub_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_DURATION_MS = 1000 * 60 * 30;
const secureCookies = process.env.NODE_ENV === "production";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return {
      ok: false as const,
      error: "invalid_email",
    };
  }

  if (password.length < 8) {
    return {
      ok: false as const,
      error: "password_too_short",
    };
  }

  return {
    ok: true as const,
    email: normalizedEmail,
  };
}

async function setSessionCookie(token: string, expiresAt: number) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existingToken) {
    execute("DELETE FROM sessions WHERE id = ?", [hashSessionToken(existingToken)]);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

async function createSession(userId: string) {
  const token = createSessionToken();
  const sessionId = hashSessionToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  execute("DELETE FROM sessions WHERE expires_at <= ?", [now]);
  execute(
    `
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `,
    [sessionId, userId, expiresAt, new Date(now).toISOString()],
  );

  await setSessionCookie(token, expiresAt);
}

function clearExpiredPasswordResetTokens() {
  execute("DELETE FROM password_reset_tokens WHERE expires_at <= ?", [Date.now()]);
}

export async function signUpUser(email: string, password: string) {
  const validation = validateCredentials(email, password);

  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
  }

  const existing = queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    [validation.email],
  );

  if (existing) {
    return { ok: false as const, error: "email_exists" };
  }

  const userId = randomUUID();
  const createdAt = new Date().toISOString();

  execute(
    `
      INSERT INTO users (id, email, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `,
    [userId, validation.email, createPasswordHash(password), createdAt],
  );

  await createSession(userId);

  return { ok: true as const };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = queryOne<StoredUser>(
    `
      SELECT id, email, password_hash, created_at
      FROM users
      WHERE email = ?
    `,
    [normalizedEmail],
  );

  if (!user || !verifyPasswordHash(password, user.password_hash)) {
    return { ok: false as const, error: "invalid_login" };
  }

  await createSession(user.id);

  return { ok: true as const };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const now = Date.now();
  const session = queryOne<{
    user_id: string;
    expires_at: number;
    email: string;
    created_at: string;
  }>(
    `
      SELECT sessions.user_id, sessions.expires_at, users.email, users.created_at
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ?
    `,
    [hashSessionToken(token)],
  );

  if (!session || session.expires_at <= now) {
    execute("DELETE FROM sessions WHERE id = ?", [hashSessionToken(token)]);
    return null;
  }

  return {
    id: session.user_id,
    email: session.email,
    createdAt: session.created_at,
  };
}

export async function createPasswordResetRequest(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false as const, error: "invalid_email" };
  }

  const user = queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    [normalizedEmail],
  );

  clearExpiredPasswordResetTokens();

  if (!user) {
    return {
      ok: true as const,
      resetToken: null,
    };
  }

  const rawToken = randomUUID();
  const tokenId = hashSessionToken(rawToken);
  const now = Date.now();

  execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [user.id]);
  execute(
    `
      INSERT INTO password_reset_tokens (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `,
    [
      tokenId,
      user.id,
      now + PASSWORD_RESET_DURATION_MS,
      new Date(now).toISOString(),
    ],
  );

  return {
    ok: true as const,
    resetToken: rawToken,
  };
}

export function getPasswordResetTokenStatus(token: string | null) {
  if (!token) {
    return {
      valid: false as const,
      error: "missing_reset_token",
    };
  }

  clearExpiredPasswordResetTokens();

  const resetToken = queryOne<{
    user_id: string;
    expires_at: number;
  }>(
    `
      SELECT user_id, expires_at
      FROM password_reset_tokens
      WHERE id = ?
    `,
    [hashSessionToken(token)],
  );

  if (!resetToken || resetToken.expires_at <= Date.now()) {
    return {
      valid: false as const,
      error: "invalid_reset_token",
    };
  }

  return {
    valid: true as const,
  };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const validation = validateCredentials("reset@pophub.local", password);

  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
  }

  clearExpiredPasswordResetTokens();

  const resetToken = queryOne<{
    user_id: string;
    expires_at: number;
  }>(
    `
      SELECT user_id, expires_at
      FROM password_reset_tokens
      WHERE id = ?
    `,
    [hashSessionToken(token)],
  );

  if (!resetToken || resetToken.expires_at <= Date.now()) {
    return { ok: false as const, error: "invalid_reset_token" };
  }

  execute("UPDATE users SET password_hash = ? WHERE id = ?", [
    createPasswordHash(password),
    resetToken.user_id,
  ]);
  execute("DELETE FROM sessions WHERE user_id = ?", [resetToken.user_id]);
  execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [resetToken.user_id]);

  await createSession(resetToken.user_id);

  return { ok: true as const };
}
