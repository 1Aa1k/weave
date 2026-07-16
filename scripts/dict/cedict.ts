// CC-CEDICT adapter: reverse English-gloss lookup for Mandarin.
//
// CEDICT lines look like:
//   傳統 传统 [chuan2 tong3] /tradition/traditional/convention/CL:個|个[ge4]/
// Display form is simplified, reading is tone-marked pinyin. CEDICT has no
// POS tags, so the bucket is scored from gloss shape ("to ..." = verb) and
// a Mandarin frequency list stands in for JMdict's "common" flag.

import fs from "node:fs";
import type { LexiconEntry, Pos } from "../../src/lib/types";
import type { DictAdapter } from "./adapter";
import { markPinyin } from "./pinyin";

interface CedictEntry {
  simplified: string;
  pinyin: string;
  glosses: string[];
  /** 1-based line number in the source file, used as `seq`. */
  line: number;
}

interface Hit {
  entry: CedictEntry;
  glossIdx: number;
}

// Entries a learner should never get as a first word for an English lemma.
const SKIP_GLOSS =
  /variant of|archaic|see [A-Z一-鿿]|surname |old name|used in|erhua|Taiwan pr\.|\(literary\)|\(dialect\)|\(coll\.\) pr\./i;

const MAX_HEADWORD_CHARS = 4;

export function parseCedict(text: string): CedictEntry[] {
  const entries: CedictEntry[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/\s*$/);
    if (!m) continue;
    const glosses = m[4].split("/").filter((g) => g && !g.startsWith("CL:"));
    if (glosses.length === 0) continue;
    entries.push({ simplified: m[2], pinyin: m[3], glosses, line: i + 1 });
  }
  return entries;
}

/** gloss text (lowercased, "to " stripped) -> hits, single-word glosses only */
function buildGlossIndex(entries: CedictEntry[]): Map<string, Hit[]> {
  const index = new Map<string, Hit[]>();
  for (const entry of entries) {
    if (entry.simplified.length > MAX_HEADWORD_CHARS) continue;
    if (entry.glosses.some((g) => SKIP_GLOSS.test(g))) continue;
    entry.glosses.forEach((gloss, glossIdx) => {
      const key = gloss.toLowerCase().replace(/^to /, "").replace(/ \(.*\)$/, "");
      if (key.length < 2 || key.includes(" ")) return;
      let hits = index.get(key);
      if (!hits) index.set(key, (hits = []));
      hits.push({ entry, glossIdx });
    });
  }
  return index;
}

function loadFrequencyRanks(freqPath: string | null): Map<string, number> {
  const ranks = new Map<string, number>();
  if (!freqPath || !fs.existsSync(freqPath)) return ranks;
  const lines = fs.readFileSync(freqPath, "utf8").split("\n");
  lines.forEach((line, i) => {
    const word = line.split(" ")[0];
    if (word && !ranks.has(word)) ranks.set(word, i + 1);
  });
  return ranks;
}

function scoreHit(hit: Hit, pos: Pos, ranks: Map<string, number>): number {
  const gloss = hit.entry.glosses[hit.glossIdx];
  const isVerbGloss = gloss.toLowerCase().startsWith("to ");
  if (pos === "verb" && !isVerbGloss) return -1;
  if (pos !== "verb" && isVerbGloss) return -1;

  let score = 0;
  const rank = ranks.get(hit.entry.simplified);
  if (rank !== undefined && rank <= 5000) score += 4;
  else if (rank !== undefined && rank <= 20000) score += 2;
  if (hit.glossIdx === 0) score += 2;
  // Proper-noun entries (Alice, Beijing) are capitalized in CEDICT glosses.
  if (/^[A-Z]/.test(gloss)) score -= 3;
  return score;
}

function hitToEntry(hit: Hit): LexiconEntry {
  return {
    word: hit.entry.simplified,
    reading: markPinyin(hit.entry.pinyin),
    gloss: hit.entry.glosses.slice(0, 4).join("; "),
    seq: hit.entry.line,
  };
}

export function loadCedictAdapter(dictPath: string, freqPath: string | null): DictAdapter {
  const entries = parseCedict(fs.readFileSync(dictPath, "utf8"));
  const index = buildGlossIndex(entries);
  const ranks = loadFrequencyRanks(freqPath);

  const best = (lemma: string, pos: Pos): { hit: Hit | null; score: number } => {
    let hit: Hit | null = null;
    let score = -1;
    for (const h of index.get(lemma) ?? []) {
      const s = scoreHit(h, pos, ranks);
      if (s > score) {
        hit = h;
        score = s;
      }
    }
    return { hit, score };
  };

  return {
    language: "zh",
    lookup(lemma, pos) {
      const { hit, score } = best(lemma, pos);
      return hit && score >= 0 ? hitToEntry(hit) : null;
    },
    bestScore(lemma, pos) {
      return best(lemma, pos).score;
    },
  };
}
