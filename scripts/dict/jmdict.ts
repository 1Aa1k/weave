// JMdict adapter: reverse English-gloss lookup for Japanese.
// Source is jmdict-simplified JSON (github.com/scriptin/jmdict-simplified).

import fs from "node:fs";
import type { LexiconEntry, Pos } from "../../src/lib/types";
import type { DictAdapter } from "./adapter";

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
  const { word: jmWord, senseIdx } = hit;
  const kanji = (jmWord.kanji.find((k) => k.common) ?? jmWord.kanji[0])?.text ?? null;
  const reading = pickReading(jmWord, kanji);
  const display = kanji ?? reading;
  const gloss = jmWord.sense[senseIdx].gloss
    .filter((g) => g.lang === "eng")
    .slice(0, 4)
    .map((g) => g.text)
    .join("; ");
  return { word: display, reading: display === reading ? "" : reading, gloss, seq: Number(jmWord.id) };
}

export function loadJmdictAdapter(dictPath: string): DictAdapter {
  const jmdict: { words: JmWord[] } = JSON.parse(fs.readFileSync(dictPath, "utf8"));
  const index = buildGlossIndex(jmdict.words);

  const best = (lemma: string, pos: Pos): { hit: Hit | null; score: number } => {
    let hit: Hit | null = null;
    let score = -1;
    for (const h of index.get(lemma) ?? []) {
      const s = scoreHit(h, pos);
      if (s > score) {
        hit = h;
        score = s;
      }
    }
    return { hit, score };
  };

  return {
    language: "ja",
    lookup(lemma, pos) {
      const { hit, score } = best(lemma, pos);
      return hit && score >= 0 ? hitToEntry(hit) : null;
    },
    bestScore(lemma, pos) {
      return best(lemma, pos).score;
    },
  };
}
