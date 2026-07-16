// Shared types for book data, lexicon, and review state.

/** Part of speech buckets we swap. Proper nouns and function words are excluded. */
export type Pos = "noun" | "verb" | "adj" | "adv";

/** Stable key for a swappable word: `${lemma}|${pos}`. */
export type LexemeId = string;

/**
 * One slice of chapter text. Concatenating `s` over all tokens of a
 * paragraph reproduces the paragraph text exactly.
 * `l` is set only on tokens that are swappable words with a lexicon entry.
 */
export interface Token {
  s: string;
  l?: LexemeId;
}

export interface Chapter {
  book: string;
  index: number; // 1-based
  title: string;
  paragraphs: Token[][];
}

/** A candidate lexeme found during ingest, before lexicon lookup. */
export interface Candidate {
  id: LexemeId;
  lemma: string;
  pos: Pos;
  /** Frequency rank in general English (lower = more common). */
  rank: number;
  /** Occurrences in this book. */
  count: number;
  /** Chapters (1-based, ascending) the lexeme appears in. */
  chapters: number[];
}

/** A lexeme with a dictionary entry, scheduled for introduction. */
export interface VocabEntry extends Candidate {
  /** Chapter whose review session introduces this word as a new card. */
  introducedChapter: number;
}

/** Japanese dictionary entry for one lexeme. */
export interface LexiconEntry {
  /** Display form, kanji when available. */
  ja: string;
  /** Kana reading; empty when `ja` is already kana-only. */
  reading: string;
  /** Short English gloss list, "; "-joined. */
  gloss: string;
  /** JMdict sequence number, for tracing back to the source entry. */
  seq: number;
}

export interface BookMeta {
  slug: string;
  title: string;
  /** BCP-47-ish code of the language being learned: "ja", "zh", "es"... */
  language: string;
  chapterCount: number;
  chapterTitles: string[];
}

/** Words per chapter introduced as new flashcards. */
export const NEW_WORDS_PER_CHAPTER = 15;
