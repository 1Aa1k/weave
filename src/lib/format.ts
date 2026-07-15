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
