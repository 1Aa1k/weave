// Find the sentence in a book where a lexeme first appears, for card context.

import { getChapter } from "./books";
import type { Token } from "./types";

export interface Example {
  before: string;
  word: string;
  after: string;
}

const MAX_SIDE = 90; // chars of context on each side of the word

function paragraphText(tokens: Token[]): string {
  return tokens.map((t) => t.s).join("");
}

function trimToSentence(text: string, from: "start" | "end"): string {
  // walk toward the word until a sentence boundary; fall back to a hard cap
  const boundary = /[.!?]["']?\s/g;
  if (from === "start") {
    let cut = 0;
    for (const m of text.matchAll(boundary)) cut = (m.index ?? 0) + m[0].length;
    const s = text.slice(cut);
    return s.length > MAX_SIDE ? "..." + s.slice(-MAX_SIDE) : s;
  }
  const m = boundary.exec(text);
  const s = m ? text.slice(0, (m.index ?? 0) + 1) : text;
  return s.length > MAX_SIDE ? s.slice(0, MAX_SIDE) + "..." : s;
}

/** First occurrence of the lexeme in the given chapter, as a split sentence. */
export function findExample(slug: string, lexemeId: string, chapterIndex: number): Example | null {
  let chapter;
  try {
    chapter = getChapter(slug, chapterIndex);
  } catch {
    return null;
  }
  for (const tokens of chapter.paragraphs) {
    const i = tokens.findIndex((t) => t.l === lexemeId);
    if (i === -1) continue;
    const text = paragraphText(tokens);
    const beforeRaw = paragraphText(tokens.slice(0, i));
    const word = tokens[i].s;
    const afterRaw = text.slice(beforeRaw.length + word.length);
    return {
      before: trimToSentence(beforeRaw, "start"),
      word,
      after: trimToSentence(afterRaw, "end"),
    };
  }
  return null;
}
