import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.WEAVE_DB ?? path.join(process.cwd(), "data", "weave.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cards (
  language TEXT NOT NULL,
  lexeme_id TEXT NOT NULL,
  book TEXT NOT NULL,
  card_json TEXT NOT NULL,
  due TEXT NOT NULL,
  state INTEGER NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (language, lexeme_id)
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

/**
 * Cards used to be keyed by lexeme id alone ("know|verb"), so a German book
 * and a Japanese book would share - and overwrite - one card. Cards are now
 * keyed per language (still shared across books of the same language), and
 * pre-existing rows take the language of the book that created them.
 */
function migrateCardsToLanguageKey(db: Database.Database): void {
  const cols = db.prepare("PRAGMA table_info(cards)").all() as { name: string }[];
  if (cols.some((c) => c.name === "language")) return;
  const books = db.prepare("SELECT DISTINCT book FROM cards").all() as { book: string }[];
  const languageOf = new Map(books.map(({ book }) => [book, bookLanguage(book)]));
  db.transaction(() => {
    db.exec("ALTER TABLE cards RENAME TO cards_v1");
    db.exec("DROP INDEX IF EXISTS idx_cards_due");
    db.exec(SCHEMA);
    const insert = db.prepare(
      `INSERT INTO cards (language, lexeme_id, book, card_json, due, state, stability)
       SELECT ?, lexeme_id, book, card_json, due, state, stability FROM cards_v1 WHERE book = ?`,
    );
    for (const [book, language] of languageOf) insert.run(language, book);
    db.exec("DROP TABLE cards_v1");
  })();
}

/** A book's target language from its meta.json; "unknown" if the book is gone. */
function bookLanguage(book: string): string {
  const metaPath = path.join(process.cwd(), "data", "books", book, "meta.json");
  if (!fs.existsSync(metaPath)) return "unknown";
  return JSON.parse(fs.readFileSync(metaPath, "utf8")).language as string;
}

declare global {
  var weaveDb: Database.Database | undefined;
}

/** Singleton connection, survives Next.js dev-mode module reloads. */
export function getDb(): Database.Database {
  if (!globalThis.weaveDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    // Migrate before SCHEMA: its CREATE INDEX IF NOT EXISTS is harmless on
    // the old table, but the migration needs to see the old shape first.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'cards'").get()) {
      migrateCardsToLanguageKey(db);
    }
    db.exec(SCHEMA);
    globalThis.weaveDb = db;
  }
  return globalThis.weaveDb;
}
