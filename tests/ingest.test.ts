import { describe, expect, it } from "vitest";
import {
  normalizeText,
  splitParagraphs,
  stripGutenberg,
  tokenizeParagraph,
} from "../scripts/ingest";
import { chapterize } from "../scripts/lib/chapterize";

describe("normalizeText", () => {
  it("straightens typographic punctuation", () => {
    expect(normalizeText("“hi” ‘there’ a—b")).toBe("\"hi\" 'there' a--b");
  });
});

describe("stripGutenberg", () => {
  it("keeps only the body between markers", () => {
    const text = "junk\n*** START OF THE PROJECT GUTENBERG EBOOK ALICE ***\nbody here\n*** END OF THE PROJECT GUTENBERG EBOOK ALICE ***\nlicense";
    expect(stripGutenberg(text).trim()).toBe("body here");
  });

  it("returns input unchanged when markers are missing", () => {
    expect(stripGutenberg("no markers")).toBe("no markers");
  });
});

function fakeBody(n: number): string {
  return `paragraph ${n} `.repeat(120).trim();
}

describe("chapterize", () => {
  it("detects CHAPTER <roman> headings and takes the next line as title", () => {
    const text = [
      "CHAPTER I.\nDown the Rabbit-Hole\n\n" + fakeBody(1),
      "CHAPTER II.\nThe Pool of Tears\n\n" + fakeBody(2),
      "CHAPTER III.\nA Caucus-Race\n\n" + fakeBody(3),
    ].join("\n\n");
    const { strategy, chapters } = chapterize(text);
    expect(strategy).toBe("chapter-roman");
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe("Down the Rabbit-Hole");
    expect(chapters[1].body).toContain("paragraph 2");
  });

  it("detects 'Chapter One' spelled headings with inline titles", () => {
    const text = [
      "Chapter One The Cyclone\n\n" + fakeBody(1),
      "Chapter Two The Council\n\n" + fakeBody(2),
      "Chapter Three The Rescue\n\n" + fakeBody(3),
    ].join("\n\n");
    const { strategy, chapters } = chapterize(text);
    expect(strategy).toBe("chapter-spelled");
    expect(chapters).toHaveLength(3);
  });

  it("ignores table-of-contents heading clusters", () => {
    const toc = "CHAPTER I.\nCHAPTER II.\nCHAPTER III.\n\n";
    const text =
      toc +
      ["CHAPTER I.\nA\n\n" + fakeBody(1), "CHAPTER II.\nB\n\n" + fakeBody(2), "CHAPTER III.\nC\n\n" + fakeBody(3)].join("\n\n");
    const { chapters } = chapterize(text);
    expect(chapters).toHaveLength(3);
  });

  it("falls back to chunking when no headings exist", () => {
    const text = Array.from({ length: 80 }, (_, i) => fakeBody(i)).join("\n\n");
    const { strategy, chapters } = chapterize(text);
    expect(strategy).toBe("chunk-fallback");
    expect(chapters.length).toBeGreaterThan(1);
    expect(chapters[0].title).toBe("Part 1");
  });
});

describe("splitParagraphs", () => {
  it("joins wrapped lines and drops blanks", () => {
    expect(splitParagraphs("a\nb\n\n\nc")).toEqual(["a b", "c"]);
  });
});

describe("tokenizeParagraph", () => {
  it("reconstructs the exact input from token surfaces", () => {
    const inputs = [
      "Alice was beginning to get very tired of sitting by her sister.",
      "\"Curiouser and curiouser!\" cried Alice; she was much surprised.",
      "  odd   spacing -- and (parens), plus 'quotes' here.",
      "numbers 123 mixed with words, don't stop!",
      "",
    ];
    for (const p of inputs) {
      const tokens = tokenizeParagraph(p, () => {});
      expect(tokens.map((t) => t.s).join("")).toBe(p);
    }
  });

  it("reconstructs arbitrary noisy input (fuzz)", () => {
    const pieces = ["cat", "ran", "\"", "'", ",", ".", "--", " ", "  ", "12", "n't", "(", ")", ";", "!", "?", "word's"];
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let i = 0; i < 200; i++) {
      const n = Math.floor(rand() * 30);
      const p = Array.from({ length: n }, () => pieces[Math.floor(rand() * pieces.length)]).join("");
      const tokens = tokenizeParagraph(p, () => {});
      expect(tokens.map((t) => t.s).join("")).toBe(p);
    }
  });

  it("emits lexemes for content words but not proper nouns or stoplist", () => {
    const seen: string[] = [];
    tokenizeParagraph("Alice quickly opened the strange door.", (id) => seen.push(id));
    expect(seen).toContain("strange|adj");
    expect(seen).toContain("door|noun");
    expect(seen).toContain("open|verb");
    expect(seen).toContain("quickly|adv");
    expect(seen.some((id) => id.startsWith("alice|"))).toBe(false);
    expect(seen.some((id) => id.startsWith("the|"))).toBe(false);
  });

  it("marks swappable tokens with their lexeme id", () => {
    const tokens = tokenizeParagraph("She found a garden.", () => {});
    const garden = tokens.find((t) => t.s === "garden");
    expect(garden?.l).toBe("garden|noun");
  });
});
