import { describe, expect, it } from "vitest";
import { scheduleIntroductions } from "../scripts/build-lexicon";
import type { Candidate } from "../src/lib/types";

function cand(id: string, rank: number, chapters: number[]): Candidate {
  const [lemma, pos] = id.split("|");
  return { id, lemma, pos: pos as Candidate["pos"], rank, count: 1, chapters };
}

describe("scheduleIntroductions", () => {
  it("caps new words per chapter and prefers frequent words", () => {
    const candidates = [
      cand("a|noun", 1, [1]),
      cand("b|noun", 2, [1]),
      cand("c|noun", 3, [1]),
      cand("d|noun", 4, [2]),
    ];
    const vocab = scheduleIntroductions(candidates, () => true, 2, 2);
    const ch1 = vocab.filter((v) => v.introducedChapter === 1).map((v) => v.id);
    expect(ch1).toEqual(["a|noun", "b|noun"]);
    // c missed the ch1 cut but also occurs in ch1 only; it is never introduced
    expect(vocab.find((v) => v.id === "c|noun")).toBeUndefined();
    expect(vocab.find((v) => v.id === "d|noun")?.introducedChapter).toBe(2);
  });

  it("only introduces words that occur in the introducing chapter", () => {
    const candidates = [cand("late|adj", 1, [3])];
    const vocab = scheduleIntroductions(candidates, () => true, 3, 5);
    expect(vocab[0].introducedChapter).toBe(3);
  });

  it("skips lexemes without dictionary entries", () => {
    const candidates = [cand("a|noun", 1, [1]), cand("b|noun", 2, [1])];
    const vocab = scheduleIntroductions(candidates, (id) => id === "b|noun", 1, 5);
    expect(vocab.map((v) => v.id)).toEqual(["b|noun"]);
  });

  it("introduces each lemma once even across parts of speech", () => {
    const candidates = [
      cand("right|adj", 10, [1]),
      cand("right|verb", 11, [1]),
      cand("right|noun", 12, [2]),
    ];
    const vocab = scheduleIntroductions(candidates, () => true, 2, 5);
    expect(vocab.map((v) => v.id)).toEqual(["right|adj"]);
  });
});
