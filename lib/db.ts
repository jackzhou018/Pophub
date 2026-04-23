import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";

type SqlValue = string | number | null;

function getDatabasePath() {
  const configuredPath = process.env.POPHUB_DB_PATH?.trim();

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath);
  }

  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".data",
    "pophub.sqlite",
  );
}

function initializeDatabase() {
  const databasePath = getDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);

  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
      ON password_reset_tokens (user_id);
    CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
      ON password_reset_tokens (expires_at);

    CREATE TABLE IF NOT EXISTS provider_connections (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER NOT NULL,
      connected_at TEXT NOT NULL,
      provider_account_id TEXT,
      provider_account_label TEXT,
      PRIMARY KEY (user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  return database;
}

const globalForDatabase = globalThis as typeof globalThis & {
  __pophubDatabase?: Database.Database;
};

function getDatabase() {
  if (!globalForDatabase.__pophubDatabase) {
    globalForDatabase.__pophubDatabase = initializeDatabase();
  }

  return globalForDatabase.__pophubDatabase;
}

export function execute(sql: string, values: SqlValue[] = []) {
  return getDatabase().prepare(sql).run(...values);
}

export function queryOne<T>(sql: string, values: SqlValue[] = []) {
  return getDatabase().prepare(sql).get(...values) as T | undefined;
}

export function queryAll<T>(sql: string, values: SqlValue[] = []) {
  return getDatabase().prepare(sql).all(...values) as T[];
}
