// Adapter registry: pick the dictionary for a book's target language.

import path from "node:path";
import type { DictAdapter } from "./adapter";
import { loadJmdictAdapter } from "./jmdict";
import { loadCedictAdapter } from "./cedict";
import { loadKaikkiDeAdapter } from "./kaikki-de";

const ZH_FREQ = path.join("data", "raw", "zh_cn_50k.txt");
const DE_FREQ = path.join("data", "raw", "de_50k.txt");

export function loadAdapter(language: string, dictPath?: string): DictAdapter {
  if (language === "ja") {
    return loadJmdictAdapter(dictPath ?? process.env.JMDICT ?? "/data/dicts/jmdict-eng.json");
  }
  if (language === "zh") {
    return loadCedictAdapter(dictPath ?? process.env.CEDICT ?? "/data/dicts/cedict.txt", ZH_FREQ);
  }
  if (language === "de") {
    return loadKaikkiDeAdapter(dictPath ?? process.env.KAIKKI_DE ?? "/data/dicts/kaikki-de.jsonl", DE_FREQ);
  }
  throw new Error(`no dictionary adapter for language "${language}" (have: ja, zh, de)`);
}
