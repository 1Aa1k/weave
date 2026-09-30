import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "weave-test-"));
  process.env.WEAVE_DB = path.join(tmpDir, "test.db");
  vi.resetModules();
  globalThis.weaveDb = undefined;
});

afterEach(() => {
  globalThis.weaveDb?.close();
  globalThis.weaveDb = undefined;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function loadSrs() {
  return await import("../src/lib/srs");
}

describe("rateCard", () => {
  it("creates a card on first rating and schedules it forward", async () => {
    const srs = await loadSrs();
    const now = new Date("2026-07-15T12:00:00Z");
    const card = srs.rateCard("cat|noun", "alice", 3, now);
    expect(card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(srs.getCardRow("cat|noun", "ja")).toBeDefined();
  });

  it("rejects nothing but records a review log entry", async () => {
    const srs = await loadSrs();
    srs.rateCard("dog|noun", "alice", 1);
    const row = srs.getCardRow("dog|noun", "ja");
    expect(row?.book).toBe("alice");
  });
});

describe("isKnown / furigana fade", () => {
  it("is not known when new, known after stability grows past threshold", async () => {
    const srs = await loadSrs();
    let now = new Date("2026-01-01T12:00:00Z");
    srs.rateCard("run|verb", "alice", 4, now);
    // simulate spaced Easy reviews until stability passes the threshold
    for (let i = 0; i < 6; i++) {
      now = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
      srs.rateCard("run|verb", "alice", 4, now);
    }
    expect(srs.isKnown(srs.getCardRow("run|verb", "ja"))).toBe(true);
    expect(srs.isKnown(undefined)).toBe(false);
  });
});

describe("clicks", () => {
  it("records and aggregates clicks per lexeme", async () => {
    const srs = await loadSrs();
    srs.recordClick("cat|noun", "alice", 1);
    srs.recordClick("cat|noun", "alice", 1);
    srs.recordClick("dog|noun", "alice", 2);
    const counts = srs.clickCounts("alice");
    expect(counts.get("cat|noun")).toBe(2);
    expect(counts.get("dog|noun")).toBe(1);
  });
});

describe("chapter gate", () => {
  it("starts with no chapters done, so only chapter 1 cards are reviewable", async () => {
    const srs = await loadSrs();
    expect(srs.getCardsDoneThrough("alice")).toBe(0);
  });
});

describe("buildSession + gate (integration, real alice data)", () => {
  it("serves 15 new words for chapter 1; finishing them opens reading ch1", async () => {
    const srs = await loadSrs();
    const first = srs.buildSession("alice", 1);
    expect(first.newWords).toHaveLength(15);
    expect(first.done).toBe(false);
    expect(srs.getCardsDoneThrough("alice")).toBe(0);

    const now = new Date();
    for (const w of first.newWords) srs.rateCard(w.id, "alice", 3, now);

    const after = srs.buildSession("alice", 1, now);
    expect(after.done).toBe(true);
    expect(srs.getCardsDoneThrough("alice")).toBe(1);
  });
});

describe("cards per language", () => {
  it("keeps a German card apart from the Japanese card for the same lexeme", async () => {
    const srs = await loadSrs();
    const now = new Date("2026-09-30T12:00:00Z");
    srs.rateCard("know|verb", "alice", 4, now);
    srs.rateCard("know|verb", "alice-de", 1, now);
    const ja = srs.getCardRow("know|verb", "ja");
    const de = srs.getCardRow("know|verb", "de");
    expect(ja?.book).toBe("alice");
    expect(de?.book).toBe("alice-de");
    expect(ja!.stability).toBeGreaterThan(de!.stability);
  });

  it("migrates an old lexeme-keyed cards table, tagging rows by book language", async () => {
    const Database = (await import("better-sqlite3")).default;
    const old = new Database(process.env.WEAVE_DB!);
    old.exec(`CREATE TABLE cards (lexeme_id TEXT PRIMARY KEY, book TEXT NOT NULL,
      card_json TEXT NOT NULL, due TEXT NOT NULL, state INTEGER NOT NULL,
      stability REAL NOT NULL DEFAULT 0);
      CREATE INDEX idx_cards_due ON cards(book, due);`);
    const ins = old.prepare("INSERT INTO cards VALUES (?, ?, '{}', '2026-01-01', 2, 9)");
    ins.run("know|verb", "alice");
    ins.run("say|verb", "alice-zh");
    old.close();

    const srs = await loadSrs();
    expect(srs.getCardRow("know|verb", "ja")?.stability).toBe(9);
    expect(srs.getCardRow("say|verb", "zh")?.book).toBe("alice-zh");
    expect(srs.getCardRow("know|verb", "de")).toBeUndefined();
  });
});
