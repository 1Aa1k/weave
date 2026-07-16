import { describe, expect, it } from "vitest";
import { mergePhrases, tokenizeParagraph, type PhraseDef } from "../scripts/ingest";
import type { Token } from "../src/lib/types";

const PHRASES: PhraseDef[] = [
  { phrase: "of course", rank: 300 },
  { phrase: "all the time", rank: 800 },
  { phrase: "at once", rank: 800 },
];

function collect(paragraph: string, phrases = PHRASES) {
  const seen: { id: string; lemma: string; pos: string; surface: string }[] = [];
  const tokens = tokenizeParagraph(
    paragraph,
    (id, lemma, pos, surface) => seen.push({ id, lemma, pos, surface }),
    phrases,
  );
  return { tokens, seen };
}

describe("phrase merging", () => {
  it("merges a phrase into one token with a phrase lexeme id", () => {
    const { tokens, seen } = collect("She knew it was true, of course, and said so.");
    const phraseToken = tokens.find((t) => t.l === "of course|phrase");
    expect(phraseToken?.s).toBe("of course");
    expect(seen.some((s) => s.id === "of course|phrase" && s.pos === "phrase")).toBe(true);
    // the swallowed word no longer reports a lexeme of its own
    expect(seen.some((s) => s.lemma === "course")).toBe(false);
  });

  it("matches case-insensitively at sentence start", () => {
    const { tokens } = collect("Of course she went at once.");
    expect(tokens.find((t) => t.l === "of course|phrase")?.s).toBe("Of course");
    expect(tokens.find((t) => t.l === "at once|phrase")?.s).toBe("at once");
  });

  it("prefers the longest phrase", () => {
    const tokens: Token[] = [
      { s: "all" }, { s: " " }, { s: "the" }, { s: " " }, { s: "time", l: "time|noun" },
    ];
    const merged = mergePhrases(tokens, [
      { phrase: "all the time", rank: 800 },
      { phrase: "the time", rank: 100 },
    ]);
    expect(merged).toEqual([{ s: "all the time", l: "all the time|phrase" }]);
  });

  it("preserves the exact paragraph text", () => {
    const para = 'And "of course," she said at once, was all the time wrong.';
    const { tokens } = collect(para);
    expect(tokens.map((t) => t.s).join("")).toBe(para);
  });

  it("does not merge across punctuation", () => {
    const { tokens } = collect("the end of. course was set");
    expect(tokens.some((t) => t.l === "of course|phrase")).toBe(false);
  });
});
