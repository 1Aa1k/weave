// Chapter detection for raw book text. Tries heading strategies in order of
// confidence; falls back to fixed-size chunking so any text splits sensibly.

export interface RawChapter {
  title: string;
  body: string;
}

export interface ChapterizeResult {
  strategy: string;
  chapters: RawChapter[];
}

const ROMAN = "[IVXLC]+";
// Spelled-out chapter numbers cover one through forty-ish, plenty for books.
const SPELLED =
  "(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty(?:-\\w+)?|Thirty(?:-\\w+)?|Forty(?:-\\w+)?)";

/**
 * Heading strategies, most specific first. Each pattern must match a whole
 * heading line (column 0). A strategy wins if it finds >= 3 headings.
 */
const STRATEGIES: { name: string; pattern: RegExp }[] = [
  { name: "chapter-roman", pattern: new RegExp(`^CHAPTER ${ROMAN}\\.?.*$`, "gim") },
  { name: "chapter-number", pattern: /^CHAPTER \d+\.?.*$/gim },
  { name: "chapter-spelled", pattern: new RegExp(`^Chapter ${SPELLED}\\b.*$`, "gm") },
  { name: "numbered-dot-title", pattern: /^\d{1,2}\.\s+\S.*$/gm },
  { name: "roman-only", pattern: new RegExp(`^${ROMAN}\\.?\\s*$`, "gm") },
  { name: "markdown-heading", pattern: /^#{1,2}\s+\S.*$/gm },
];

const MIN_HEADINGS = 3;
/** Headings closer together than this many chars are front-matter noise (TOC). */
const MIN_CHAPTER_CHARS = 800;
const FALLBACK_TARGET_WORDS = 3000;

function findHeadings(text: string, pattern: RegExp): { index: number; line: string }[] {
  const out: { index: number; line: string }[] = [];
  for (const m of text.matchAll(pattern)) {
    out.push({ index: m.index ?? 0, line: m[0].trim() });
  }
  return out;
}

/**
 * Drop table-of-contents clusters: keep only headings whose following body
 * is at least MIN_CHAPTER_CHARS before the next heading.
 */
function dropTocClusters(
  headings: { index: number; line: string }[],
  textLength: number,
): { index: number; line: string }[] {
  return headings.filter((h, i) => {
    const next = headings[i + 1]?.index ?? textLength;
    return next - h.index >= MIN_CHAPTER_CHARS;
  });
}

function titleFromHeading(line: string, body: string): string {
  // "CHAPTER I. Down the Rabbit-Hole" -> title on the heading line itself
  const inline = line
    .replace(/^(CHAPTER|Chapter)\s+\S+\.?\s*/, "")
    .replace(/^#{1,2}\s+/, "")
    .replace(/^\d{1,2}\.\s+/, "")
    .trim();
  if (inline.length > 1) return inline;
  // otherwise the first non-blank line of the body
  const first = body.split("\n").find((l) => l.trim().length > 0);
  return first?.trim() ?? line;
}

function splitAt(
  text: string,
  headings: { index: number; line: string }[],
): RawChapter[] {
  return headings.map((h, i) => {
    const start = h.index + text.slice(h.index).indexOf("\n") + 1;
    const end = headings[i + 1]?.index ?? text.length;
    let body = text.slice(start, end).trim();
    let title = titleFromHeading(h.line, body);
    // when the title came from the body's first line, remove it from the body
    if (!/\S/.test(h.line.replace(/^(CHAPTER|Chapter)?\s*[IVXLC\d.#]+\s*$/i, ""))) {
      const lines = body.split("\n");
      const t = lines.findIndex((l) => l.trim().length > 0);
      if (t !== -1 && lines[t].trim() === title) body = lines.slice(t + 1).join("\n").trim();
    }
    return { title, body };
  });
}

/** Split into ~FALLBACK_TARGET_WORDS chunks on paragraph boundaries. */
function chunkFallback(text: string): RawChapter[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chapters: RawChapter[] = [];
  let current: string[] = [];
  let words = 0;
  for (const p of paragraphs) {
    current.push(p);
    words += p.split(/\s+/).length;
    if (words >= FALLBACK_TARGET_WORDS) {
      chapters.push({ title: `Part ${chapters.length + 1}`, body: current.join("\n\n") });
      current = [];
      words = 0;
    }
  }
  if (current.length > 0) {
    chapters.push({ title: `Part ${chapters.length + 1}`, body: current.join("\n\n") });
  }
  return chapters;
}

export function chapterize(text: string): ChapterizeResult {
  for (const { name, pattern } of STRATEGIES) {
    const headings = dropTocClusters(findHeadings(text, pattern), text.length);
    if (headings.length >= MIN_HEADINGS) {
      const chapters = splitAt(text, headings).filter((c) => c.body.length > 0);
      if (chapters.length >= MIN_HEADINGS) return { strategy: name, chapters };
    }
  }
  return { strategy: "chunk-fallback", chapters: chunkFallback(text) };
}
