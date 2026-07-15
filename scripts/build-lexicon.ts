// Build a Japanese lexicon for a book's candidate lexemes via JMdict reverse
// lookup, then schedule word introductions (NEW_WORDS_PER_CHAPTER per chapter).
//
// Usage: npx tsx scripts/build-lexicon.ts <slug> <jmdict-eng.json>
//
// Reads  data/books/<slug>/candidates.json
// Reads  data/books/<slug>/lexicon-overrides.json (optional, hand-curated)
// Writes data/books/<slug>/lexicon.json  { [lexemeId]: LexiconEntry }
// Writes data/books/<slug>/vocab.json    VocabEntry[] (introduction schedule)

import fs from "node:fs";
import path from "node:path";
import type { Candidate, LexiconEntry, Pos, VocabEntry } from "../src/lib/types";
import { NEW_WORDS_PER_CHAPTER } from "../src/lib/types";

interface JmKanji { common: boolean; text: string }
interface JmKana { common: boolean; text: string; appliesToKanji: string[] }
interface JmGloss { lang: string; text: string }
interface JmSense {
  partOfSpeech: string[];
  misc: string[];
  gloss: JmGloss[];
  appliesToKanji: string[];
  appliesToKana: string[];
}
interface JmWord { id: string; kanji: JmKanji[]; kana: JmKana[]; sense: JmSense[] }

// hon/hum/pol: keigo forms (参る, おっしゃる) are wrong first words for a learner
const SKIP_MISC = new Set(["arch", "obs", "rare", "obsc", "vulg", "derog", "hon", "hum", "pol"]);

function posMatches(bucket: Pos, tags: string[]): boolean {
  if (bucket === "noun") return tags.includes("n");
  if (bucket === "verb") return tags.some((t) => t.startsWith("v") && t !== "v-unspec");
  if (bucket === "adj") return tags.some((t) => t === "adj-i" || t === "adj-na" || t === "adj-ix");
  return tags.includes("adv") || tags.includes("adv-to");
}

interface Hit { word: JmWord; senseIdx: number; glossIdx: number }

/** gloss text (lowercased, "to " stripped) -> hits across all of JMdict */
export function buildGlossIndex(words: JmWord[]): Map<string, Hit[]> {
  const index = new Map<string, Hit[]>();
  for (const word of words) {
    word.sense.forEach((sense, senseIdx) => {
      if (sense.misc.some((m) => SKIP_MISC.has(m))) return;
      sense.gloss.forEach((gloss, glossIdx) => {
        if (gloss.lang !== "eng") return;
        const key = gloss.text.toLowerCase().replace(/^to /, "");
        if (key.length < 2 || key.includes(" ")) return; // single-word glosses only
        let hits = index.get(key);
        if (!hits) index.set(key, (hits = []));
        hits.push({ word, senseIdx, glossIdx });
      });
    });
  }
  return index;
}

function isCommon(word: JmWord): boolean {
  return word.kanji.some((k) => k.common) || word.kana.some((k) => k.common);
}

function isKatakanaOnly(word: JmWord): boolean {
  if (word.kanji.length > 0) return false;
  return word.kana.every((k) => /^[゠-ヿー]+$/.test(k.text));
}

export function scoreHit(hit: Hit, bucket: Pos): number {
  const sense = hit.word.sense[hit.senseIdx];
  if (!posMatches(bucket, sense.partOfSpeech)) return -1;
  let score = 0;
  if (isCommon(hit.word)) score += 4;
  if (hit.glossIdx === 0) score += 2;
  if (hit.senseIdx === 0) score += 1;
  // Loanwords (リトル, ラブ) teach nothing; prefer native vocabulary.
  if (isKatakanaOnly(hit.word)) score -= 4;
  return score;
}

function pickReading(word: JmWord, kanjiText: string | null): string {
  const applicable = word.kana.filter(
    (k) => !kanjiText || k.appliesToKanji.includes("*") || k.appliesToKanji.includes(kanjiText),
  );
  const pool = applicable.length > 0 ? applicable : word.kana;
  return (pool.find((k) => k.common) ?? pool[0])?.text ?? "";
}

export function hitToEntry(hit: Hit): LexiconEntry {
  const { word, senseIdx } = hit;
  const kanji = (word.kanji.find((k) => k.common) ?? word.kanji[0])?.text ?? null;
  const reading = pickReading(word, kanji);
  const ja = kanji ?? reading;
  const gloss = word.sense[senseIdx].gloss
    .filter((g) => g.lang === "eng")
    .slice(0, 4)
    .map((g) => g.text)
    .join("; ");
  return { ja, reading: ja === reading ? "" : reading, gloss, seq: Number(word.id) };
}

export function lookup(index: Map<string, Hit[]>, lemma: string, pos: Pos): LexiconEntry | null {
  const hits = index.get(lemma);
  if (!hits) return null;
  let best: Hit | null = null;
  let bestScore = -1;
  for (const hit of hits) {
    const score = scoreHit(hit, pos);
    if (score > bestScore) {
      best = hit;
      bestScore = score;
    }
  }
  return best && bestScore >= 0 ? hitToEntry(best) : null;
}

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

function main() {
  const [, , slug, jmdictPath] = process.argv;
  if (!slug || !jmdictPath) {
    console.error("usage: tsx scripts/build-lexicon.ts <slug> <jmdict-eng.json>");
    process.exit(1);
  }
  const bookDir = path.join("data", "books", slug);
  const candidates: Candidate[] = JSON.parse(
    fs.readFileSync(path.join(bookDir, "candidates.json"), "utf8"),
  );
  const chapterCount = fs.readdirSync(path.join(bookDir, "chapters")).length;

  console.log("loading JMdict...");
  const jmdict: { words: JmWord[] } = JSON.parse(fs.readFileSync(jmdictPath, "utf8"));
  const index = buildGlossIndex(jmdict.words);

  const overridesPath = path.join(bookDir, "lexicon-overrides.json");
  const overrides: Record<string, LexiconEntry> = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
    : {};

  const lexicon: Record<string, LexiconEntry> = {};
  for (const c of candidates) {
    const entry = overrides[c.id] ?? lookup(index, c.lemma, c.pos);
    if (entry) lexicon[c.id] = entry;
  }

  const vocab = scheduleIntroductions(candidates, (id) => id in lexicon, chapterCount);
  // Trim the lexicon to scheduled words only; the rest are never displayed.
  const scheduledIds = new Set(vocab.map((v) => v.id));
  const trimmed = Object.fromEntries(
    Object.entries(lexicon).filter(([id]) => scheduledIds.has(id)),
  );

  fs.writeFileSync(path.join(bookDir, "lexicon.json"), JSON.stringify(trimmed, null, 1));
  fs.writeFileSync(path.join(bookDir, "vocab.json"), JSON.stringify(vocab, null, 1));
  console.log(
    `${slug}: ${candidates.length} candidates, ${Object.keys(lexicon).length} dictionary hits, ` +
    `${vocab.length} scheduled across ${chapterCount} chapters`,
  );
}

if (process.argv[1]?.endsWith("build-lexicon.ts")) main();
