// Ingest a plain-text book into chapter token files + candidate lexeme list.
//
// Usage: npx tsx scripts/ingest.ts <book.txt> <slug> "<Title>" [freqlist.txt]
//
// Output under data/books/<slug>/:
//   meta.json        BookMeta
//   chapters/NN.json Chapter (tokenized paragraphs)
//   candidates.json  Candidate[] (content lemmas ranked by English frequency)

import fs from "node:fs";
import path from "node:path";
import posTagger from "wink-pos-tagger";
import lemmatizer from "wink-lemmatizer";
import type { BookMeta, Candidate, Chapter, Pos, Token } from "../src/lib/types";

const MAX_BOOK_BYTES = 20 * 1024 * 1024; // fail fast on absurd input

// Auxiliaries and near-function words that tag as content but make bad swaps.
const LEMMA_STOPLIST = new Set([
  "be", "have", "do", "will", "would", "can", "could", "shall", "should",
  "may", "might", "must", "not", "n't", "as", "being", "mine", "very", "so", "too", "then", "there",
  "here", "now", "just", "only", "even", "also", "again", "well", "much",
  "more", "most", "such", "own", "same", "other",
]);

const tagger = posTagger();

function posBucket(pennTag: string): Pos | null {
  if (pennTag === "NN" || pennTag === "NNS") return "noun";
  if (pennTag.startsWith("VB")) return "verb";
  if (pennTag.startsWith("JJ")) return "adj";
  if (pennTag.startsWith("RB")) return "adv";
  return null; // NNP/NNPS (proper nouns) and everything else excluded
}

function lemmatize(word: string, pos: Pos): string {
  const w = word.toLowerCase();
  if (pos === "noun") return lemmatizer.noun(w);
  if (pos === "verb") return lemmatizer.verb(w);
  if (pos === "adj") return lemmatizer.adjective(w);
  return w; // adverbs: wink has no adverb lemmatizer; surface form is fine
}

/** Normalize typographic punctuation so the tagger and display text agree. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, "--")
    .replace(/\r\n/g, "\n")
    .replace(/_([^_\n]+)_/g, "$1"); // Gutenberg italics markup
}

export function stripGutenberg(text: string): string {
  const start = text.search(/^\*\*\* START OF [^\n]*\*\*\*$/m);
  const end = text.search(/^\*\*\* END OF [^\n]*\*\*\*$/m);
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(text.indexOf("\n", start) + 1, end);
}

export interface RawChapter {
  title: string;
  body: string;
}

/** Split on `CHAPTER <roman>.` headings at column 0; TOC lines are indented. */
export function splitChapters(text: string): RawChapter[] {
  const parts = text.split(/^(CHAPTER [IVXLC]+\.)\s*$/m);
  const chapters: RawChapter[] = [];
  // parts: [preamble, heading, body, heading, body, ...]
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const body = parts[i + 1];
    const lines = body.split("\n");
    let t = 0;
    while (t < lines.length && lines[t].trim() === "") t++;
    const title = (lines[t] ?? "").trim();
    chapters.push({ title, body: lines.slice(t + 1).join("\n").trim() });
  }
  return chapters;
}

export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

interface TaggedWord {
  value: string;
  tag: string; // "word" | "punctuation" | ...
  pos: string; // Penn tag
}

/**
 * Tokenize a paragraph into exact text slices, attaching a lexeme id to
 * swappable words. Tagger tokens are re-aligned to the original string by
 * sequential search; anything that fails alignment becomes plain text.
 */
export function tokenizeParagraph(
  paragraph: string,
  onLexeme: (id: string, lemma: string, pos: Pos, surface: string) => void,
): Token[] {
  const tagged: TaggedWord[] = tagger.tagSentence(paragraph);
  const tokens: Token[] = [];
  let cursor = 0;

  for (const tok of tagged) {
    const at = paragraph.indexOf(tok.value, cursor);
    if (at === -1) continue; // tagger transformed the surface; leave as gap text
    if (at > cursor) tokens.push({ s: paragraph.slice(cursor, at) });
    cursor = at + tok.value.length;

    const bucket = tok.tag === "word" ? posBucket(tok.pos) : null;
    if (!bucket || !/^[A-Za-z][A-Za-z']*$/.test(tok.value)) {
      tokens.push({ s: tok.value });
      continue;
    }
    const lemma = lemmatize(tok.value, bucket);
    if (lemma.length < 2 || LEMMA_STOPLIST.has(lemma)) {
      tokens.push({ s: tok.value });
      continue;
    }
    const id = `${lemma}|${bucket}`;
    onLexeme(id, lemma, bucket, tok.value);
    tokens.push({ s: tok.value, l: id });
  }
  if (cursor < paragraph.length) tokens.push({ s: paragraph.slice(cursor) });
  return tokens;
}

function loadFreqRanks(freqPath: string): Map<string, number> {
  const ranks = new Map<string, number>();
  const lines = fs.readFileSync(freqPath, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const word = lines[i].split(" ")[0];
    if (word && !ranks.has(word)) ranks.set(word, i + 1);
  }
  return ranks;
}

function main() {
  const [, , bookPath, slug, title, freqPath] = process.argv;
  if (!bookPath || !slug || !title) {
    console.error('usage: tsx scripts/ingest.ts <book.txt> <slug> "<Title>" [freqlist.txt]');
    process.exit(1);
  }
  if (fs.statSync(bookPath).size > MAX_BOOK_BYTES) {
    throw new Error(`book file exceeds ${MAX_BOOK_BYTES} bytes; refusing`);
  }

  const text = normalizeText(stripGutenberg(fs.readFileSync(bookPath, "utf8")));
  const rawChapters = splitChapters(text);
  if (rawChapters.length === 0) throw new Error("no chapters found");

  const ranks = freqPath ? loadFreqRanks(freqPath) : new Map<string, number>();
  const candidates = new Map<string, Candidate>();

  const outDir = path.join("data", "books", slug);
  fs.mkdirSync(path.join(outDir, "chapters"), { recursive: true });

  rawChapters.forEach((raw, i) => {
    const chapterIndex = i + 1;
    const paragraphs = splitParagraphs(raw.body).map((p) =>
      tokenizeParagraph(p, (id, lemma, pos) => {
        const existing = candidates.get(id);
        if (existing) {
          existing.count++;
          if (existing.chapters.at(-1) !== chapterIndex) existing.chapters.push(chapterIndex);
        } else {
          candidates.set(id, {
            id, lemma, pos,
            rank: ranks.get(lemma) ?? 999999,
            count: 1,
            chapters: [chapterIndex],
          });
        }
      }),
    );
    const chapter: Chapter = { book: slug, index: chapterIndex, title: raw.title, paragraphs };
    const nn = String(chapterIndex).padStart(2, "0");
    fs.writeFileSync(path.join(outDir, "chapters", `${nn}.json`), JSON.stringify(chapter));
  });

  const meta: BookMeta = {
    slug, title, language: "ja",
    chapterCount: rawChapters.length,
    chapterTitles: rawChapters.map((c) => c.title),
  };
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

  const sorted = [...candidates.values()].sort((a, b) => a.rank - b.rank);
  fs.writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify(sorted, null, 1));

  console.log(`${slug}: ${rawChapters.length} chapters, ${sorted.length} candidate lexemes`);
}

if (process.argv[1]?.endsWith("ingest.ts")) main();
