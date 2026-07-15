// Read-only access to processed book data under data/books/<slug>/.

import fs from "node:fs";
import path from "node:path";
import type { BookMeta, Chapter, LexiconEntry, VocabEntry } from "./types";

const BOOKS_DIR = path.join(process.cwd(), "data", "books");
const SLUG_RE = /^[a-z0-9-]+$/; // slugs come from URLs; never let them path-traverse

function bookDir(slug: string): string {
  if (!SLUG_RE.test(slug)) throw new Error(`invalid book slug: ${JSON.stringify(slug)}`);
  return path.join(BOOKS_DIR, slug);
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function listBooks(): BookMeta[] {
  if (!fs.existsSync(BOOKS_DIR)) return [];
  return fs
    .readdirSync(BOOKS_DIR)
    .filter((d) => fs.existsSync(path.join(BOOKS_DIR, d, "meta.json")))
    .map((d) => readJson<BookMeta>(path.join(BOOKS_DIR, d, "meta.json")));
}

export function getMeta(slug: string): BookMeta {
  return readJson<BookMeta>(path.join(bookDir(slug), "meta.json"));
}

export function getChapter(slug: string, index: number): Chapter {
  const meta = getMeta(slug);
  if (!Number.isInteger(index) || index < 1 || index > meta.chapterCount) {
    throw new Error(`chapter ${index} out of range for ${slug}`);
  }
  const nn = String(index).padStart(2, "0");
  return readJson<Chapter>(path.join(bookDir(slug), "chapters", `${nn}.json`));
}

export function getVocab(slug: string): VocabEntry[] {
  return readJson<VocabEntry[]>(path.join(bookDir(slug), "vocab.json"));
}

export function getLexicon(slug: string): Record<string, LexiconEntry> {
  return readJson<Record<string, LexiconEntry>>(path.join(bookDir(slug), "lexicon.json"));
}
