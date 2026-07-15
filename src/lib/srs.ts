// FSRS scheduling, review sessions, chapter gating, and furigana fade.

import { fsrs, generatorParameters, createEmptyCard, type Card, type Grade } from "ts-fsrs";
import { getDb } from "./db";
import { getVocab } from "./books";
import type { VocabEntry } from "./types";

/** A word is "known" (furigana hidden) once FSRS stability reaches this many days. */
export const KNOWN_STABILITY_DAYS = 7;
const FSRS_REVIEW_STATE = 2;

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

interface CardRow {
  lexeme_id: string;
  book: string;
  card_json: string;
  due: string;
  state: number;
  stability: number;
}

function parseCard(row: CardRow): Card {
  const c = JSON.parse(row.card_json);
  c.due = new Date(c.due);
  if (c.last_review) c.last_review = new Date(c.last_review);
  return c as Card;
}

function saveCard(lexemeId: string, book: string, card: Card): void {
  getDb()
    .prepare(
      `INSERT INTO cards (lexeme_id, book, card_json, due, state, stability)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(lexeme_id) DO UPDATE SET
         card_json = excluded.card_json, due = excluded.due,
         state = excluded.state, stability = excluded.stability`,
    )
    .run(lexemeId, book, JSON.stringify(card), card.due.toISOString(), card.state, card.stability);
}

export function getCardRow(lexemeId: string): CardRow | undefined {
  return getDb().prepare("SELECT * FROM cards WHERE lexeme_id = ?").get(lexemeId) as
    | CardRow
    | undefined;
}

export function isKnown(row: CardRow | undefined): boolean {
  return !!row && row.state === FSRS_REVIEW_STATE && row.stability >= KNOWN_STABILITY_DAYS;
}

/** Apply a rating (1=Again 2=Hard 3=Good 4=Easy), creating the card if new. */
export function rateCard(lexemeId: string, book: string, rating: Grade, now = new Date()): Card {
  const row = getCardRow(lexemeId);
  const card = row ? parseCard(row) : createEmptyCard(now);
  const next = scheduler.repeat(card, now)[rating].card;
  saveCard(lexemeId, book, next);
  getDb()
    .prepare("INSERT INTO review_log (lexeme_id, rating, ts) VALUES (?, ?, ?)")
    .run(lexemeId, rating, now.toISOString());
  return next;
}

export function recordClick(lexemeId: string, book: string, chapter: number): void {
  getDb()
    .prepare("INSERT INTO clicks (lexeme_id, book, chapter, ts) VALUES (?, ?, ?, ?)")
    .run(lexemeId, book, chapter, new Date().toISOString());
}

export function clickCounts(book: string): Map<string, number> {
  const rows = getDb()
    .prepare("SELECT lexeme_id, COUNT(*) AS n FROM clicks WHERE book = ? GROUP BY lexeme_id")
    .all(book) as { lexeme_id: string; n: number }[];
  return new Map(rows.map((r) => [r.lexeme_id, r.n]));
}

export function getUnlockedChapter(book: string): number {
  const row = getDb()
    .prepare("SELECT unlocked_chapter FROM progress WHERE book = ?")
    .get(book) as { unlocked_chapter: number } | undefined;
  return row?.unlocked_chapter ?? 1;
}

function setUnlockedChapter(book: string, chapter: number): void {
  getDb()
    .prepare(
      `INSERT INTO progress (book, unlocked_chapter) VALUES (?, ?)
       ON CONFLICT(book) DO UPDATE SET
         unlocked_chapter = MAX(unlocked_chapter, excluded.unlocked_chapter)`,
    )
    .run(book, chapter);
}

export interface ReviewSession {
  /** Chapter's scheduled words with no card yet, most-clicked then most-common first. */
  newWords: VocabEntry[];
  /** Previously introduced words due for review now. */
  dueWords: VocabEntry[];
  /** True when nothing is left; reaching it unlocks the next chapter. */
  done: boolean;
  unlockedChapter: number;
}

export function buildSession(book: string, chapter: number, now = new Date()): ReviewSession {
  const vocab = getVocab(book);
  const clicks = clickCounts(book);
  const byId = new Map(vocab.map((v) => [v.id, v]));

  const newWords = vocab
    .filter((v) => v.introducedChapter === chapter && !getCardRow(v.id))
    .sort((a, b) => (clicks.get(b.id) ?? 0) - (clicks.get(a.id) ?? 0) || a.rank - b.rank);

  const dueRows = getDb()
    .prepare("SELECT * FROM cards WHERE book = ? AND due <= ?")
    .all(book, now.toISOString()) as CardRow[];
  const dueWords = dueRows
    .map((r) => byId.get(r.lexeme_id))
    .filter((v): v is VocabEntry => !!v);

  const done = newWords.length === 0 && dueWords.length === 0;
  if (done) setUnlockedChapter(book, chapter + 1);
  return { newWords, dueWords, done, unlockedChapter: getUnlockedChapter(book) };
}

/** Display state for every lexeme swapped in a given chapter. */
export function swapStates(
  book: string,
  chapter: number,
): Map<string, { known: boolean }> {
  const vocab = getVocab(book);
  const result = new Map<string, { known: boolean }>();
  for (const v of vocab) {
    if (v.introducedChapter <= chapter) {
      result.set(v.id, { known: isKnown(getCardRow(v.id)) });
    }
  }
  return result;
}
