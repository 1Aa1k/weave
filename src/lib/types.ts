// Shared types for book data, lexicon, and review state.

/**
 * Part of speech buckets we swap. Proper nouns and function words are
 * excluded. "phrase" is a multi-word unit from the curated phrase lexicon
 * ("of course" -> もちろん) - the first grammar-stage swap: the unit crosses
 * word boundaries instead of mapping one word to one word.
 */
export type Pos = "noun" | "verb" | "adj" | "adv" | "phrase";

/** Stable key for a swappable unit: `${lemma}|${pos}`. The lemma of a phrase
 * is the phrase itself ("of course"). */
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

/** Target-language dictionary entry for one lexeme. */
export interface LexiconEntry {
  /** Display form in the target language (kanji/hanzi when available). */
  word: string;
  /** Reading aid (kana for ja, pinyin for zh, der/die/das for de nouns); empty when `word` needs none. */
  reading: string;
  /** Short English gloss list, "; "-joined. */
  gloss: string;
  /** Source-dictionary id (JMdict sequence, CEDICT line), for tracing back. */
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
