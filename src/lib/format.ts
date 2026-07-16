const JP_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 1 -> 一, 12 -> 十二, 21 -> 二十一. Supports 1-99, plenty for chapters. */
export function jpNumber(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 0 ? "" : tens === 1 ? "十" : JP_DIGITS[tens] + "十";
  return tensPart + JP_DIGITS[ones];
}

/** 1 -> 第一章 (chapter ornament). */
export function jpChapter(n: number): string {
  return `第${jpNumber(n)}章`;
}

/**
 * Chapter ornament in the book's own language. The chrome follows the book:
 * a Japanese or Chinese book gets 第N章, anything else a plain chapter label.
 */
export function chapterOrnament(language: string, n: number): string {
  if (language === "ja" || language === "zh") return jpChapter(n);
  return `Ch. ${n}`;
}

/** What the pronunciation aid above a woven word is called in this language. */
export function readingName(language: string): string {
  if (language === "ja") return "furigana";
  if (language === "zh") return "pinyin";
  return "hint";
}

/** Session-complete praise in the book's language. */
export function praise(language: string): string {
  const map: Record<string, string> = {
    ja: "よくできました",
    zh: "做得好",
    es: "Bien hecho",
    fr: "Bien joue",
    ko: "잘했어요",
  };
  return map[language] ?? "Well done";
}
