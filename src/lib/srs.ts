// FSRS scheduling, review sessions, chapter gating, and furigana fade.

import { fsrs, generatorParameters, createEmptyCard, type Card, type Grade } from "ts-fsrs";
import { getDb } from "./db";
import { getMeta, getVocab } from "./books";
import type { VocabEntry } from "./types";

/** A word is "known" (furigana hidden) once FSRS stability reaches this many days. */
export const KNOWN_STABILITY_DAYS = 7;
const FSRS_REVIEW_STATE = 2;

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

interface CardRow {
  language: string;
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

function saveCard(lexemeId: string, language: string, book: string, card: Card): void {
  getDb()
    .prepare(
      `INSERT INTO cards (language, lexeme_id, book, card_json, due, state, stability)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(language, lexeme_id) DO UPDATE SET
         card_json = excluded.card_json, due = excluded.due,
         state = excluded.state, stability = excluded.stability`,
    )
    .run(language, lexemeId, book, JSON.stringify(card), card.due.toISOString(), card.state, card.stability);
}

/** A lexeme's card in one target language; books of that language share it. */
export function getCardRow(lexemeId: string, language: string): CardRow | undefined {
  return getDb()
    .prepare("SELECT * FROM cards WHERE language = ? AND lexeme_id = ?")
    .get(language, lexemeId) as CardRow | undefined;
}

export function isKnown(row: CardRow | undefined): boolean {
  return !!row && row.state === FSRS_REVIEW_STATE && row.stability >= KNOWN_STABILITY_DAYS;
}

/** Apply a rating (1=Again 2=Hard 3=Good 4=Easy), creating the card if new. */
export function rateCard(lexemeId: string, book: string, rating: Grade, now = new Date()): Card {
  const language = getMeta(book).language;
  const row = getCardRow(lexemeId, language);
  const card = row ? parseCard(row) : createEmptyCard(now);
  const next = scheduler.repeat(card, now)[rating].card;
  saveCard(lexemeId, language, book, next);
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

/**
 * Highest chapter whose flashcards are complete. Words come before text:
 * reading chapter N requires cards done through N; the next reviewable
 * chapter is N+1.
 */
export function getCardsDoneThrough(book: string): number {
  const row = getDb()
    .prepare("SELECT unlocked_chapter FROM progress WHERE book = ?")
    .get(book) as { unlocked_chapter: number } | undefined;
  return row?.unlocked_chapter ?? 0;
}

function setCardsDoneThrough(book: string, chapter: number): void {
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
  /** True when nothing is left; reaching it unlocks reading this chapter. */
  done: boolean;
  cardsDoneThrough: number;
}

export function buildSession(book: string, chapter: number, now = new Date()): ReviewSession {
  const vocab = getVocab(book);
  const language = getMeta(book).language;
  const clicks = clickCounts(book);
  const byId = new Map(vocab.map((v) => [v.id, v]));

  const newWords = vocab
    .filter((v) => v.introducedChapter === chapter && !getCardRow(v.id, language))
    .sort((a, b) => (clicks.get(b.id) ?? 0) - (clicks.get(a.id) ?? 0) || a.rank - b.rank);

  const dueRows = getDb()
    .prepare("SELECT * FROM cards WHERE book = ? AND due <= ?")
    .all(book, now.toISOString()) as CardRow[];
  const dueWords = dueRows
    .map((r) => byId.get(r.lexeme_id))
    .filter((v): v is VocabEntry => !!v);

  const done = newWords.length === 0 && dueWords.length === 0;
  if (done) setCardsDoneThrough(book, chapter);
  return { newWords, dueWords, done, cardsDoneThrough: getCardsDoneThrough(book) };
}

export interface BookStats {
  /** Cards that exist (words met at least once). */
  met: number;
  /** Cards due for review now. */
  due: number;
}

export function bookStats(book: string, now = new Date()): BookStats {
  const db = getDb();
  const met = (
    db.prepare("SELECT COUNT(*) AS n FROM cards WHERE book = ?").get(book) as { n: number }
  ).n;
  const due = (
    db.prepare("SELECT COUNT(*) AS n FROM cards WHERE book = ? AND due <= ?")
      .get(book, now.toISOString()) as { n: number }
  ).n;
  return { met, due };
}

export function totalDue(now = new Date()): number {
  return (
    getDb().prepare("SELECT COUNT(*) AS n FROM cards WHERE due <= ?")
      .get(now.toISOString()) as { n: number }
  ).n;
}

/** Display state for every lexeme swapped in a given chapter. */
export function swapStates(
  book: string,
  chapter: number,
): Map<string, { known: boolean }> {
  const vocab = getVocab(book);
  const language = getMeta(book).language;
  const result = new Map<string, { known: boolean }>();
  for (const v of vocab) {
    if (v.introducedChapter <= chapter) {
      result.set(v.id, { known: isKnown(getCardRow(v.id, language)) });
    }
  }
  return result;
}
