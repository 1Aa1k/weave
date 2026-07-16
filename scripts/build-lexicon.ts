// Build a target-language lexicon for a book's candidate lexemes, then
// schedule word introductions (NEW_WORDS_PER_CHAPTER per chapter).
//
// Resolution order per lexeme:
//   1. data/books/<slug>/lexicon-overrides.json  (book-specific senses)
//   2. data/lexicon/<language>.json              (global curated lexicon)
//   3. dictionary reverse lookup                 (auto; low-confidence picks
//      are written to review-queue.json for a curation pass)
//
// The dictionary comes from the book's language (meta.json): JMdict for ja,
// CC-CEDICT for zh. See scripts/dict/.
//
// Usage: npx tsx scripts/build-lexicon.ts <slug> [dict-path]
//
// Writes data/books/<slug>/lexicon.json       { [lexemeId]: LexiconEntry }
// Writes data/books/<slug>/vocab.json         VocabEntry[] (schedule)
// Writes data/books/<slug>/review-queue.json  scheduled auto-picks needing review

import fs from "node:fs";
import path from "node:path";
import type { BookMeta, Candidate, LexiconEntry, Pos, VocabEntry } from "../src/lib/types";
import { NEW_WORDS_PER_CHAPTER } from "../src/lib/types";
import { loadAdapter } from "./dict";

/**
 * Assign each looked-up lexeme an introduction chapter: each chapter gets up
 * to NEW_WORDS_PER_CHAPTER new words that actually occur in it, most frequent
 * (in general English) first. Unassigned lexemes are never swapped.
 */
export function scheduleIntroductions(
  candidates: Candidate[],
  hasEntry: (id: string) => boolean,
  chapterCount: number,
  perChapter = NEW_WORDS_PER_CHAPTER,
): VocabEntry[] {
  const assigned = new Map<string, number>();
  const assignedLemmas = new Set<string>();
  for (let ch = 1; ch <= chapterCount; ch++) {
    // One card per lemma: "make|noun" after "make|verb" is tagger noise more
    // often than a real second word, and it burns a new-card slot.
    const pool = candidates
      .filter(
        (c) =>
          hasEntry(c.id) && !assigned.has(c.id) &&
          !assignedLemmas.has(c.lemma) && c.chapters.includes(ch),
      )
      .sort((a, b) => a.rank - b.rank || b.count - a.count);
    let taken = 0;
    for (const c of pool) {
      if (taken >= perChapter) break;
      if (assignedLemmas.has(c.lemma)) continue; // same lemma, other POS, same chapter
      assigned.set(c.id, ch);
      assignedLemmas.add(c.lemma);
      taken++;
    }
  }
  return candidates
    .filter((c) => assigned.has(c.id))
    .map((c) => ({ ...c, introducedChapter: assigned.get(c.id)! }))
    .sort((a, b) => a.introducedChapter - b.introducedChapter || a.rank - b.rank);
}

/** Common words carry the highest wrong-sense risk; queue them for review. */
const REVIEW_RANK_THRESHOLD = 3000;
const REVIEW_SCORE_THRESHOLD = 4;

export interface ReviewItem {
  id: string;
  lemma: string;
  pos: Pos;
  rank: number;
  count: number;
  pick: LexiconEntry;
  score: number;
  reason: string;
}

export interface LexiconSummary {
  language: string;
  scheduled: number;
  chapterCount: number;
  byProvenance: { override: number; global: number; phrase: number; auto: number };
  reviewQueue: ReviewItem[];
}

export function buildBookLexicon(slug: string, dictPath?: string): LexiconSummary {
  const bookDir = path.join("data", "books", slug);
  const candidates: Candidate[] = JSON.parse(
    fs.readFileSync(path.join(bookDir, "candidates.json"), "utf8"),
  );
  const meta: BookMeta = JSON.parse(fs.readFileSync(path.join(bookDir, "meta.json"), "utf8"));
  const chapterCount = fs.readdirSync(path.join(bookDir, "chapters")).length;

  console.log(`loading ${meta.language} dictionary...`);
  const dict = loadAdapter(meta.language, dictPath);

  const overridesPath = path.join(bookDir, "lexicon-overrides.json");
  const overrides: Record<string, LexiconEntry> = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
    : {};
  const globalPath = path.join("data", "lexicon", `${meta.language}.json`);
  const globalLexicon: Record<string, LexiconEntry & { source?: string }> = fs.existsSync(
    globalPath,
  )
    ? JSON.parse(fs.readFileSync(globalPath, "utf8"))
    : {};
  const phrasePath = path.join("data", "lexicon", `${meta.language}-phrases.json`);
  const phraseLexicon: Record<string, Omit<LexiconEntry, "seq"> & { rank: number }> =
    fs.existsSync(phrasePath) ? JSON.parse(fs.readFileSync(phrasePath, "utf8")) : {};

  const lexicon: Record<string, LexiconEntry> = {};
  const provenance: Record<string, "override" | "global" | "phrase" | "auto"> = {};
  for (const c of candidates) {
    if (overrides[c.id]) {
      lexicon[c.id] = overrides[c.id];
      provenance[c.id] = "override";
    } else if (globalLexicon[c.id]) {
      const { source: _source, ...entry } = globalLexicon[c.id];
      lexicon[c.id] = entry;
      provenance[c.id] = "global";
    } else if (c.pos === "phrase") {
      // Phrases only ever come from the curated file - never the dictionary.
      const def = phraseLexicon[c.lemma];
      if (def) {
        const { rank: _rank, ...entry } = def;
        lexicon[c.id] = { ...entry, seq: 0 };
        provenance[c.id] = "phrase";
      }
    } else {
      const entry = dict.lookup(c.lemma, c.pos);
      if (entry) {
        lexicon[c.id] = entry;
        provenance[c.id] = "auto";
      }
    }
  }

  const vocab = scheduleIntroductions(candidates, (id) => id in lexicon, chapterCount);
  const scheduledIds = new Set(vocab.map((v) => v.id));
  const trimmed = Object.fromEntries(
    Object.entries(lexicon).filter(([id]) => scheduledIds.has(id)),
  );

  // Scheduled auto-picks that look risky go to the review queue.
  const queue: ReviewItem[] = [];
  for (const v of vocab) {
    if (provenance[v.id] !== "auto") continue;
    const score = dict.bestScore(v.lemma, v.pos);
    const reasons: string[] = [];
    if (v.rank <= REVIEW_RANK_THRESHOLD) reasons.push(`common word (rank ${v.rank})`);
    if (score <= REVIEW_SCORE_THRESHOLD) reasons.push(`weak match (score ${score})`);
    if (reasons.length > 0) {
      queue.push({
        id: v.id, lemma: v.lemma, pos: v.pos, rank: v.rank, count: v.count,
        pick: lexicon[v.id], score, reason: reasons.join("; "),
      });
    }
  }

  fs.writeFileSync(path.join(bookDir, "lexicon.json"), JSON.stringify(trimmed, null, 1));
  fs.writeFileSync(path.join(bookDir, "vocab.json"), JSON.stringify(vocab, null, 1));
  fs.writeFileSync(path.join(bookDir, "review-queue.json"), JSON.stringify(queue, null, 1));

  const byProv = { override: 0, global: 0, phrase: 0, auto: 0 };
  for (const id of scheduledIds) byProv[provenance[id]]++;
  return {
    language: meta.language,
    scheduled: vocab.length,
    chapterCount,
    byProvenance: byProv,
    reviewQueue: queue,
  };
}

function main() {
  const [, , slug, dictPath] = process.argv;
  if (!slug) {
    console.error("usage: tsx scripts/build-lexicon.ts <slug> [dict-path]");
    process.exit(1);
  }
  const s = buildBookLexicon(slug, dictPath);
  console.log(
    `${slug} (${s.language}): ${s.scheduled} scheduled across ${s.chapterCount} chapters ` +
    `(overrides ${s.byProvenance.override}, global ${s.byProvenance.global}, phrases ${s.byProvenance.phrase}, auto ${s.byProvenance.auto}) | ` +
    `review queue: ${s.reviewQueue.length}`,
  );
}

if (process.argv[1]?.endsWith("build-lexicon.ts")) main();
