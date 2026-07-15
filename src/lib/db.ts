import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.WEAVE_DB ?? path.join(process.cwd(), "data", "weave.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cards (
  lexeme_id TEXT PRIMARY KEY,
  book TEXT NOT NULL,
  card_json TEXT NOT NULL,
  due TEXT NOT NULL,
  state INTEGER NOT NULL,
  stability REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(book, due);
CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lexeme_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lexeme_id TEXT NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
  book TEXT PRIMARY KEY,
  unlocked_chapter INTEGER NOT NULL DEFAULT 1
);
`;

declare global {
  var weaveDb: Database.Database | undefined;
}

/** Singleton connection, survives Next.js dev-mode module reloads. */
export function getDb(): Database.Database {
  if (!globalThis.weaveDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA);
    globalThis.weaveDb = db;
  }
  return globalThis.weaveDb;
}
