import { describe, expect, it } from "vitest";
import {
  normalizeText,
  splitChapters,
  splitParagraphs,
  stripGutenberg,
  tokenizeParagraph,
} from "../scripts/ingest";

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

describe("splitChapters", () => {
  it("splits on column-0 headings and takes the next line as title", () => {
    const text = "CHAPTER I.\nDown the Rabbit-Hole\n\nfirst body\n\nCHAPTER II.\nThe Pool of Tears\n\nsecond body";
    const chapters = splitChapters(text);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Down the Rabbit-Hole");
    expect(chapters[1].body).toBe("second body");
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
