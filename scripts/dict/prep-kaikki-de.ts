// Shrink the kaikki.org German Wiktionary extract (~1 GB JSONL) to the few
// fields the German adapter reads, streaming so the raw file never hits disk:
//
//   curl -s https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl \
//     | npx tsx scripts/dict/prep-kaikki-de.ts > /data/dicts/kaikki-de.jsonl
//
// Output lines: {"w":"Katze","p":"noun","g":"f","gl":["cat"],"i":123}
// `i` is the source line number, used as the entry's `seq`.

import readline from "node:readline";

const KEEP_POS = new Set(["noun", "verb", "adj", "adv"]);
// Senses a learner should never get as a first word for an English lemma.
const SKIP_TAGS = new Set([
  "form-of", "alt-of", "archaic", "obsolete", "dated", "dialectal",
  "regional", "rare", "vulgar", "derogatory", "abbreviation", "misspelling",
  "Austria", "Switzerland", "Southern-Germany", "Northern-Germany",
]);
const MAX_GLOSSES = 6;

interface KaikkiSense {
  glosses?: string[];
  tags?: string[];
  form_of?: unknown;
  alt_of?: unknown;
}

interface KaikkiEntry {
  word?: string;
  pos?: string;
  senses?: KaikkiSense[];
  head_templates?: { name?: string; args?: Record<string, string> }[];
}

/** m/f/n from the de-noun head template ("f,-,-en" -> "f"); "" when unknown. */
function nounGender(entry: KaikkiEntry): string {
  for (const t of entry.head_templates ?? []) {
    if (t.name !== "de-noun") continue;
    const g = (t.args?.["1"] ?? "").split(/[,.:]/)[0];
    if (g === "m" || g === "f" || g === "n") return g;
  }
  return "";
}

function usableGlosses(entry: KaikkiEntry): string[] {
  const out: string[] = [];
  for (const s of entry.senses ?? []) {
    if (s.form_of || s.alt_of) continue;
    if ((s.tags ?? []).some((t) => SKIP_TAGS.has(t))) continue;
    for (const g of s.glosses ?? []) if (g && out.length < MAX_GLOSSES) out.push(g);
  }
  return out;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  let line = 0;
  let kept = 0;
  for await (const raw of rl) {
    line++;
    let entry: KaikkiEntry;
    try {
      entry = JSON.parse(raw);
    } catch {
      continue; // a truncated trailing line from an interrupted stream
    }
    if (!entry.word || !entry.pos || !KEEP_POS.has(entry.pos)) continue;
    if (entry.word.includes(" ")) continue;
    const gl = usableGlosses(entry);
    if (gl.length === 0) continue;
    const g = entry.pos === "noun" ? nounGender(entry) : "";
    process.stdout.write(JSON.stringify({ w: entry.word, p: entry.pos, g, gl, i: line }) + "\n");
    kept++;
  }
  process.stderr.write(`read ${line} lines, kept ${kept}\n`);
}

main();
