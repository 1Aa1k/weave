// CC-CEDICT numbered pinyin ("ni3 hao3", "lu:4") -> tone-marked ("nǐ hǎo", "lǜ").

const MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

/**
 * Tone-mark one numbered syllable. Placement follows the standard rule:
 * mark 'a' or 'e' if present, else the 'o' of "ou", else the last vowel.
 * Tone 5 (neutral) and unparseable tokens return unmarked text.
 */
export function markSyllable(syllable: string): string {
  const m = syllable.match(/^([a-zA-ZüÜ:]+)([1-5])$/);
  if (!m) return syllable.replace(/u:/g, "ü").replace(/U:/g, "Ü");
  const body = m[1].replace(/u:/g, "ü").replace(/U:/g, "Ü").replace(/v/g, "ü").replace(/V/g, "Ü");
  const tone = Number(m[2]);
  if (tone === 5) return body;

  const lower = body.toLowerCase();
  let idx = -1;
  if (lower.includes("a")) idx = lower.indexOf("a");
  else if (lower.includes("e")) idx = lower.indexOf("e");
  else if (lower.includes("ou")) idx = lower.indexOf("o");
  else {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ("iouü".includes(lower[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx === -1) return body;

  const target = lower[idx];
  const marked = MARKS[target]?.[tone - 1];
  if (!marked) return body;
  const isUpper = body[idx] !== lower[idx];
  return body.slice(0, idx) + (isUpper ? marked.toUpperCase() : marked) + body.slice(idx + 1);
}

/** Tone-mark a whole CC-CEDICT pinyin field ("Ai4 li4 si1" -> "Ài lì sī"). */
export function markPinyin(field: string): string {
  return field.split(/\s+/).map(markSyllable).join(" ");
}
