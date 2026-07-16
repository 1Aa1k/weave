// A dictionary adapter resolves an English lemma to a target-language entry.
// One adapter per target language; build-lexicon stays language-agnostic.

import type { LexiconEntry, Pos } from "../../src/lib/types";

export interface DictAdapter {
  language: string;
  /** Best entry for this lemma in the given POS bucket, or null. */
  lookup(lemma: string, pos: Pos): LexiconEntry | null;
  /** Confidence of the best match (higher = safer); -1 when nothing matches. */
  bestScore(lemma: string, pos: Pos): number;
}
