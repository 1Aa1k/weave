// Promote a book's review queue into the global lexicon.
//
// Corrections (hand-curated fixes for wrong auto-picks) live in
// data/lexicon/ja-corrections.json as { [lexemeId]: { ja, reading, gloss } }.
// Queue items with a correction enter the global lexicon as source "manual";
// everything else is accepted as-is with source "reviewed".
//
// Usage: npx tsx scripts/promote-reviewed.ts <slug> [more slugs...]
// Re-run build-lexicon (or weave-book) afterwards to apply.

import fs from "node:fs";
import path from "node:path";
import type { LexiconEntry } from "../src/lib/types";
import type { ReviewItem } from "./build-lexicon";

const GLOBAL_PATH = path.join("data", "lexicon", "ja.json");
const CORRECTIONS_PATH = path.join("data", "lexicon", "ja-corrections.json");

function main() {
  const slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    console.error("usage: tsx scripts/promote-reviewed.ts <slug> [more slugs...]");
    process.exit(1);
  }

  const global_: Record<string, LexiconEntry & { source: string }> = JSON.parse(
    fs.readFileSync(GLOBAL_PATH, "utf8"),
  );
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
    `global lexicon now ${Object.keys(global_).length} entries ` +
    `(+${corrected} corrected, +${accepted} accepted as reviewed)`,
  );
}

main();
