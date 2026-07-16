// One command from raw book to woven: fetch, chapterize, tokenize, resolve
// lexicon (global-first), schedule, and report what needs human review.
//
// Usage:
//   npx tsx scripts/weave-book.ts <input> [--slug s] [--title "T"] [--lang ja]
//
// <input> is a local .txt path, a Project Gutenberg book id (digits), or a URL.
// Title and slug are read from the Gutenberg header when present.
// JMdict path comes from $JMDICT or /data/dicts/jmdict-eng.json.

import fs from "node:fs";
import path from "node:path";
import { ingestBook } from "./ingest";
import { buildBookLexicon } from "./build-lexicon";

const JMDICT = process.env.JMDICT ?? "/data/dicts/jmdict-eng.json";
const FREQ = path.join("data", "raw", "en_50k.txt");
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

function parseArgs(argv: string[]) {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      flags[argv[i].slice(2)] = argv[i + 1] ?? "";
      i++;
    } else {
      positional.push(argv[i]);
    }
  }
  return { input: positional[0], flags };
}

const SLUG_STOPWORDS = new Set(["the", "a", "an", "of", "and"]);

function slugify(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter((w) => !SLUG_STOPWORDS.has(w));
  return words.slice(0, 3).join("-") || "book";
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD_BYTES) throw new Error("download exceeds size limit; refusing");
  return buf.toString("utf8");
}

async function resolveInput(input: string): Promise<{ raw: string; suggestedTitle?: string }> {
  let raw: string;
  if (/^\d+$/.test(input)) {
    const url = `https://www.gutenberg.org/cache/epub/${input}/pg${input}.txt`;
    console.log(`fetching gutenberg #${input}...`);
    raw = await fetchText(url);
  } else if (/^https?:\/\//.test(input)) {
    console.log(`fetching ${input}...`);
    raw = await fetchText(input);
  } else {
    if (input.endsWith(".epub")) {
      throw new Error("epub input needs pandoc: pandoc book.epub -t plain -o book.txt");
    }
    raw = fs.readFileSync(input, "utf8");
  }
  const titleMatch = raw.match(/^Title:\s*(.+)\s*$/m);
  return { raw, suggestedTitle: titleMatch?.[1]?.trim() };
}

async function main() {
  const { input, flags } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error('usage: tsx scripts/weave-book.ts <txt|gutenberg-id|url> [--slug s] [--title "T"] [--lang ja]');
    process.exit(1);
  }

  const { raw, suggestedTitle } = await resolveInput(input);
  const title = flags.title ?? suggestedTitle;
  if (!title) throw new Error("no Title: header found; pass --title");
  const slug = flags.slug ?? slugify(title);
  const language = flags.lang ?? "ja";

  fs.mkdirSync(path.join("data", "raw"), { recursive: true });
  const rawPath = path.join("data", "raw", `${slug}.txt`);
  fs.writeFileSync(rawPath, raw);

  console.log(`\nweaving "${title}" (${slug}, ${language})`);
  const ingest = ingestBook({ bookPath: rawPath, slug, title, freqPath: FREQ, language });
  console.log(
    `  chapters: ${ingest.chapterCount} (strategy: ${ingest.strategy}) | candidates: ${ingest.candidateCount}`,
  );
  if (ingest.strategy === "chunk-fallback") {
    console.log("  NOTE: no chapter headings detected; split into even parts. Check data/raw and re-run if wrong.");
  }

  const lex = buildBookLexicon(slug, JMDICT);
  console.log(
    `  scheduled: ${lex.scheduled} words / ${lex.chapterCount} chapters ` +
    `(override ${lex.byProvenance.override}, global ${lex.byProvenance.global}, auto ${lex.byProvenance.auto})`,
  );

  const chapters = JSON.parse(
    fs.readFileSync(path.join("data", "books", slug, "meta.json"), "utf8"),
  ).chapterTitles as string[];
  console.log(`  first chapters: ${chapters.slice(0, 3).join(" | ")}`);

  if (lex.reviewQueue.length > 0) {
    console.log(`\n  REVIEW QUEUE (${lex.reviewQueue.length}) - data/books/${slug}/review-queue.json`);
    for (const item of lex.reviewQueue.slice(0, 12)) {
      console.log(
        `    ${item.id.padEnd(20)} -> ${item.pick.word} [${item.pick.reading}] ` +
        `(${item.reason}) :: ${item.pick.gloss.slice(0, 40)}`,
      );
    }
    if (lex.reviewQueue.length > 12) console.log(`    ... and ${lex.reviewQueue.length - 12} more`);
    console.log(
      "  Curate: fix entries in data/lexicon/ja.json (add source: \"manual\"), then re-run this command.",
    );
  } else {
    console.log("\n  review queue empty - fully covered by curated lexicon.");
  }
  console.log(`\ndone. book is live at /read/${slug}/1 once its first cards are done.`);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
