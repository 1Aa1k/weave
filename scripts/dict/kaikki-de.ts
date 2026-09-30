// German adapter: reverse English-gloss lookup over the kaikki.org Wiktionary
// extract (shrunk by prep-kaikki-de.ts).
//
// German needs no pronunciation aid the way kanji or hanzi do; what a learner
// cannot guess from the word is the noun's gender. So the "reading" above a
// woven noun is its article (der/die/das), and it fades with the rest of the
// reading aids once the card is known. Verbs, adjectives and adverbs get none.
//
// Wiktionary glosses are prose ("to walk; to jog; to run (to move on foot)"),
// so each gloss is split into alternatives and only single-word keys index.

import fs from "node:fs";
import type { LexiconEntry, Pos } from "../../src/lib/types";
import type { DictAdapter } from "./adapter";

interface DeEntry {
  w: string;
  p: string;
  g: string;
  gl: string[];
  i: number;
}

interface Hit {
  entry: DeEntry;
  /** Which gloss (sense) the key came from; 0 = the main sense. */
  senseIdx: number;
  /** Position of the key among that gloss's alternatives. */
  altIdx: number;
}

const ARTICLE: Record<string, string> = { m: "der", f: "die", n: "das" };
const MAX_WORD_CHARS = 14;
// Stray gloss notes that would otherwise index as English words.
const NOISE_KEYS = new Set(["e.g", "i.e", "etc", "esp", "sb", "sth"]);

/** "to walk; to jog, to run (on foot)" -> ["walk", "jog", "run"] */
export function glossKeys(gloss: string): string[] {
  const keys: string[] = [];
  const clean = gloss.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");
  for (const part of clean.split(/[;,]/)) {
    const key = part
      .trim()
      .toLowerCase()
      .replace(/^(to|a|an|the) /, "")
      .replace(/[.!?:]+$/, "");
    if (key.length < 2 || key.includes(" ") || NOISE_KEYS.has(key)) continue;
    if (!/^[a-z'-]+$/.test(key)) continue;
    keys.push(key);
  }
  return keys;
}

export function parseKaikkiDe(text: string): DeEntry[] {
  const entries: DeEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const e = JSON.parse(line) as DeEntry;
    if (e.w.length > MAX_WORD_CHARS) continue;
    entries.push(e);
  }
  return entries;
}

function buildGlossIndex(entries: DeEntry[]): Map<string, Hit[]> {
  const index = new Map<string, Hit[]>();
  for (const entry of entries) {
    entry.gl.forEach((gloss, senseIdx) => {
      glossKeys(gloss).forEach((key, altIdx) => {
        let hits = index.get(key);
        if (!hits) index.set(key, (hits = []));
        hits.push({ entry, senseIdx, altIdx });
      });
    });
  }
  return index;
}

function loadFrequencyRanks(freqPath: string | null): Map<string, number> {
  const ranks = new Map<string, number>();
  if (!freqPath || !fs.existsSync(freqPath)) return ranks;
  fs.readFileSync(freqPath, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const word = line.split(" ")[0];
      if (word && !ranks.has(word)) ranks.set(word, i + 1);
    });
  return ranks;
}

/**
 * The frequency list is lowercased subtitle text, so a noun can only be
 * ranked by its lowercase form - which for Mal or Etwas is the rank of the
 * particle "mal"/"etwas". Nouns that share a spelling with a non-noun entry
 * therefore go unranked.
 */
function unrankNounHomographs(entries: DeEntry[], ranks: Map<string, number>): Map<string, number> {
  const nonNoun = new Set(entries.filter((e) => e.p !== "noun").map((e) => e.w));
  const nounRanks = new Map<string, number>();
  for (const e of entries) {
    if (e.p !== "noun") continue;
    const lower = e.w.toLowerCase();
    const rank = ranks.get(lower);
    if (rank !== undefined && !nonNoun.has(lower)) nounRanks.set(e.w, rank);
  }
  return nounRanks;
}

function rankOf(entry: DeEntry, ranks: Map<string, number>, nounRanks: Map<string, number>) {
  return entry.p === "noun" ? nounRanks.get(entry.w) : ranks.get(entry.w);
}

function scoreHit(hit: Hit, pos: Pos, rank: number | undefined): number {
  if (hit.entry.p !== pos) return -1;
  // A noun without a known gender cannot show its article; skip it.
  if (pos === "noun" && !ARTICLE[hit.entry.g]) return -1;

  let score = 0;
  // Frequency outweighs sense order: Wiktionary lists senses by etymology,
  // not usage (denken has "to think" third, behind "to remember").
  if (rank !== undefined && rank <= 1000) score += 5;
  else if (rank !== undefined && rank <= 5000) score += 4;
  else if (rank !== undefined && rank <= 20000) score += 2;
  if (hit.senseIdx === 0) score += 1;
  if (hit.altIdx === 0) score += 1;
  // Proper nouns and abbreviations are capitalized after the first letter
  // or all-caps; a normal German word is lowercase or Capitalized.
  if (/[A-ZÄÖÜ]{2}/.test(hit.entry.w)) score -= 3;
  if (pos !== "noun" && /^[A-ZÄÖÜ]/.test(hit.entry.w)) score -= 3;
  return score;
}

/** Wiktionary glosses -> short de-duplicated "; "-list without usage notes. */
export function cleanGloss(glosses: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const gloss of glosses) {
    let g = gloss;
    // Strip innermost parentheses first so nested notes come out whole.
    while (/\([^()]*\)/.test(g)) g = g.replace(/\s*\([^()]*\)/g, "");
    g = g.replace(/\s*\[[^\]]*\]/g, "").replace(/[()]/g, "");
    for (const alt of g.split(";")) {
      const a = alt.trim().replace(/[.:]+$/, "");
      if (!a || a.length > 40 || seen.has(a.toLowerCase())) continue;
      seen.add(a.toLowerCase());
      out.push(a);
    }
  }
  return out.slice(0, 4).join("; ");
}

function hitToEntry(hit: Hit): LexiconEntry {
  return {
    word: hit.entry.w,
    reading: hit.entry.p === "noun" ? ARTICLE[hit.entry.g] : "",
    gloss: cleanGloss(hit.entry.gl),
    seq: hit.entry.i,
  };
}

export function loadKaikkiDeAdapter(dictPath: string, freqPath: string | null): DictAdapter {
  const entries = parseKaikkiDe(fs.readFileSync(dictPath, "utf8"));
  const index = buildGlossIndex(entries);
  const ranks = loadFrequencyRanks(freqPath);
  const nounRanks = unrankNounHomographs(entries, ranks);

  const best = (lemma: string, pos: Pos): { hit: Hit | null; score: number } => {
    let hit: Hit | null = null;
    let score = -1;
    let hitRank = Infinity;
    for (const h of index.get(lemma) ?? []) {
      const rank = rankOf(h.entry, ranks, nounRanks);
      const s = scoreHit(h, pos, rank);
      // Equal scores are common (every "main sense, first alternative, top
      // 1000" hit scores alike), so the more frequent German word breaks ties.
      const r = rank ?? Infinity;
      if (s > score || (s === score && s >= 0 && r < hitRank)) {
        hit = h;
        score = s;
        hitRank = r;
      }
    }
    return { hit, score };
  };

  return {
    language: "de",
    lookup(lemma, pos) {
      const { hit, score } = best(lemma, pos);
      return hit && score >= 0 ? hitToEntry(hit) : null;
    },
    bestScore(lemma, pos) {
      return best(lemma, pos).score;
    },
  };
}
