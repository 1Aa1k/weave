// Promote a book's review queue into the global lexicon.
//
// Corrections (hand-curated fixes for wrong auto-picks) live in
// data/lexicon/<language>-corrections.json as { [lexemeId]: { word, reading, gloss } }.
// The language comes from each book's meta.json; all listed slugs must share it.
// Queue items with a correction enter the global lexicon as source "manual";
// everything else is accepted as-is with source "reviewed".
//
// Usage: npx tsx scripts/promote-reviewed.ts <slug> [more slugs...]
// Re-run build-lexicon (or weave-book) afterwards to apply.

import fs from "node:fs";
import path from "node:path";
import type { LexiconEntry } from "../src/lib/types";
import type { ReviewItem } from "./build-lexicon";

function bookLanguage(slug: string): string {
  const meta = JSON.parse(
    fs.readFileSync(path.join("data", "books", slug, "meta.json"), "utf8"),
  );
  return meta.language as string;
}

function main() {
  const slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    console.error("usage: tsx scripts/promote-reviewed.ts <slug> [more slugs...]");
    process.exit(1);
  }

  const languages = new Set(slugs.map(bookLanguage));
  if (languages.size > 1) {
    console.error(`slugs span multiple languages (${[...languages].join(", ")}); run per language`);
    process.exit(1);
  }
  const language = [...languages][0];
  const GLOBAL_PATH = path.join("data", "lexicon", `${language}.json`);
  const CORRECTIONS_PATH = path.join("data", "lexicon", `${language}-corrections.json`);

  const global_: Record<string, LexiconEntry & { source: string }> = fs.existsSync(GLOBAL_PATH)
    ? JSON.parse(fs.readFileSync(GLOBAL_PATH, "utf8"))
    : {};
  const corrections: Record<string, Omit<LexiconEntry, "seq">> = fs.existsSync(CORRECTIONS_PATH)
    ? JSON.parse(fs.readFileSync(CORRECTIONS_PATH, "utf8"))
    : {};

  let corrected = 0;
  let accepted = 0;
  for (const slug of slugs) {
    const queuePath = path.join("data", "books", slug, "review-queue.json");
    const queue: ReviewItem[] = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    for (const item of queue) {
      if (global_[item.id]?.source === "manual") continue; // never clobber curation
      if (corrections[item.id]) {
        global_[item.id] = { ...corrections[item.id], seq: 0, source: "manual" };
        corrected++;
      } else if (!global_[item.id]) {
        global_[item.id] = { ...item.pick, source: "reviewed" };
        accepted++;
      }
    }
  }

  fs.writeFileSync(GLOBAL_PATH, JSON.stringify(global_, null, 1) + "\n");
  console.log(
    `global ${language} lexicon now ${Object.keys(global_).length} entries ` +
    `(+${corrected} corrected, +${accepted} accepted as reviewed)`,
  );
}

main();
