import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markPinyin, markSyllable } from "../scripts/dict/pinyin";
import { loadCedictAdapter, parseCedict } from "../scripts/dict/cedict";

describe("pinyin tone marks", () => {
  it("marks the standard vowel per syllable", () => {
    expect(markSyllable("ni3")).toBe("nǐ");
    expect(markSyllable("hao3")).toBe("hǎo"); // 'a' wins
    expect(markSyllable("xie4")).toBe("xiè"); // 'e' wins
    expect(markSyllable("gou3")).toBe("gǒu"); // 'ou' marks the o
    expect(markSyllable("shui3")).toBe("shuǐ"); // else last vowel
    expect(markSyllable("liu2")).toBe("liú");
  });

  it("handles u-umlaut spellings", () => {
    expect(markSyllable("lu:4")).toBe("lǜ");
    expect(markSyllable("lv4")).toBe("lǜ");
  });

  it("leaves neutral tone and non-syllables unmarked", () => {
    expect(markSyllable("le5")).toBe("le");
    expect(markSyllable("·")).toBe("·");
  });

  it("keeps capitalization", () => {
    expect(markSyllable("Ai4")).toBe("Ài");
  });

  it("marks whole fields", () => {
    expect(markPinyin("ni3 hao3")).toBe("nǐ hǎo");
    expect(markPinyin("zhi1 dao4")).toBe("zhī dào");
  });
});

const FIXTURE = `# CC-CEDICT sample
你好 你好 [ni3 hao3] /hello; hi/
傳統 传统 [chuan2 tong3] /tradition/traditional/convention/CL:個|个[ge4]/
去 去 [qu4] /to go/to leave/
看 看 [kan4] /to look at/to see/to watch/
尼斯 尼斯 [Ni2 si1] /Nice (city in France)/
曼 曼 [man4] /handsome/large/long/
量詞 量词 [liang4 ci2] /CL:個|个[ge4]/
`;

describe("cedict", () => {
  it("parses entries and drops comments and CL-only glosses", () => {
    const entries = parseCedict(FIXTURE);
    const simplified = entries.map((e) => e.simplified);
    expect(simplified).toContain("你好");
    expect(simplified).toContain("传统");
    expect(simplified).not.toContain("量词"); // only a classifier gloss
    const chuantong = entries.find((e) => e.simplified === "传统")!;
    expect(chuantong.glosses).toEqual(["tradition", "traditional", "convention"]);
  });

  it("looks up verbs only from 'to ...' glosses and marks pinyin", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "weave-cedict-"));
    const file = path.join(dir, "cedict.txt");
    fs.writeFileSync(file, FIXTURE);
    const dict = loadCedictAdapter(file, null);

    const go = dict.lookup("go", "verb");
    expect(go?.word).toBe("去");
    expect(go?.reading).toBe("qù");

    // "hello" is not a verb gloss; "go" is not a noun gloss
    expect(dict.lookup("hello", "verb")).toBeNull();
    expect(dict.lookup("go", "noun")).toBeNull();

    // proper-noun glosses (capitalized) score below zero and are rejected
    expect(dict.lookup("nice", "adj")).toBeNull();
    expect(dict.bestScore("nice", "adj")).toBeLessThan(dict.bestScore("see", "verb"));
  });
});
