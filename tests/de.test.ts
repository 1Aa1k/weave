import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanGloss, glossKeys, loadKaikkiDeAdapter } from "../scripts/dict/kaikki-de";
import { chapterOrnament, readingName } from "../src/lib/format";

describe("German gloss keys", () => {
  it("splits alternatives and strips to/articles and notes", () => {
    expect(glossKeys("to walk; to jog, to run (to move on foot)")).toEqual(["walk", "jog", "run"]);
    expect(glossKeys("a key")).toEqual(["key"]);
  });

  it("drops multi-word and non-word alternatives", () => {
    expect(glossKeys("house cat, Felis silvestris catus")).toEqual([]);
    expect(glossKeys("e.g., etc.")).toEqual([]);
  });
});

describe("German gloss cleanup", () => {
  it("removes nested notes and duplicate alternatives", () => {
    expect(cleanGloss(["to say", "to tell (something (verbally))", "to say"])).toBe("to say; to tell");
  });
});

// Line order matters: the rare noun comes first, so a file-order tie-break
// would pick it; frequency must win instead.
const FIXTURE = [
  { w: "Stubentiger", p: "noun", g: "m", gl: ["cat"], i: 1 },
  { w: "Katze", p: "noun", g: "f", gl: ["cat"], i: 2 },
  { w: "Mal", p: "noun", g: "n", gl: ["time, occasion"], i: 3 },
  { w: "mal", p: "adv", g: "", gl: ["times"], i: 4 },
  { w: "Zeit", p: "noun", g: "f", gl: ["time"], i: 5 },
  { w: "laufen", p: "verb", g: "", gl: ["to run"], i: 6 },
  { w: "Ohnegeschlecht", p: "noun", g: "", gl: ["rope"], i: 7 },
]
  .map((e) => JSON.stringify(e))
  .join("\n");

// Subtitle-style frequency list: "mal" outranks "zeit" as a particle.
const FREQ = ["mal 900", "zeit 800", "katze 700", "laufen 600"].join("\n");

function loadFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "weave-kaikki-de-"));
  const dictFile = path.join(dir, "kaikki-de.jsonl");
  const freqFile = path.join(dir, "de_50k.txt");
  fs.writeFileSync(dictFile, FIXTURE);
  fs.writeFileSync(freqFile, FREQ);
  return loadKaikkiDeAdapter(dictFile, freqFile);
}

describe("kaikki German adapter", () => {
  it("gives a noun its article as the reading", () => {
    const entry = loadFixture().lookup("cat", "noun");
    expect(entry).toMatchObject({ word: "Katze", reading: "die" });
  });

  it("does not let a noun borrow the rank of a same-spelled particle", () => {
    expect(loadFixture().lookup("time", "noun")?.word).toBe("Zeit");
  });

  it("gives verbs no reading and keeps POS buckets apart", () => {
    const dict = loadFixture();
    expect(dict.lookup("run", "verb")).toMatchObject({ word: "laufen", reading: "" });
    expect(dict.lookup("run", "noun")).toBeNull();
  });

  it("skips nouns whose gender is unknown", () => {
    expect(loadFixture().lookup("rope", "noun")).toBeNull();
    expect(loadFixture().bestScore("rope", "noun")).toBe(-1);
  });
});

describe("German chrome", () => {
  it("names the reading aid and the chapter in German terms", () => {
    expect(readingName("de")).toBe("article");
    expect(chapterOrnament("de", 3)).toBe("Kapitel 3");
  });
});
