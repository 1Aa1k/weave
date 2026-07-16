"use client";

import { useEffect, useRef, useState } from "react";

interface Woven {
  en: string;
  ja: string;
  ruby: string;
  gloss: string;
}

type Piece = string | Woven;

// The real third paragraph of Alice ch. 1; every swap is a real entry from
// weave's Alice lexicon.
const PASSAGE: Piece[] = [
  "There was ",
  { en: "nothing", ja: "何も", ruby: "なにも", gloss: "nothing (with negative)" },
  " so very remarkable in that; nor did Alice ",
  { en: "think", ja: "思う", ruby: "おもう", gloss: "to think; to consider" },
  " it so very much out of the ",
  { en: "way", ja: "道", ruby: "みち", gloss: "way; road; path" },
  " to ",
  { en: "hear", ja: "聞く", ruby: "きく", gloss: "to hear" },
  " the Rabbit ",
  { en: "say", ja: "言う", ruby: "いう", gloss: "to say; to utter" },
  ' to itself, "Oh ',
  { en: "dear", ja: "まあ", ruby: "", gloss: "oh dear; oh my (exclamation)" },
  '! Oh ',
  { en: "dear", ja: "まあ", ruby: "", gloss: "oh dear; oh my (exclamation)" },
  '! I shall be ',
  { en: "late", ja: "遅い", ruby: "おそい", gloss: "late; slow" },
  '!"',
];

const SWAP_COUNT = PASSAGE.filter((p) => typeof p !== "string").length;
const STAGGER_MS = 900;

export default function WeavingPassage() {
  const [swapped, setSwapped] = useState(0);
  const [slip, setSlip] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSwapped(SWAP_COUNT);
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setStarted(true),
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || swapped >= SWAP_COUNT) return;
    const t = setTimeout(() => setSwapped((n) => n + 1), swapped === 0 ? 1400 : STAGGER_MS);
    return () => clearTimeout(t);
  }, [started, swapped]);


  let wovenIndex = -1;
  return (
    <section id="demo" className="border-y border-[var(--line)] bg-[var(--paper-raised)]">
      <div ref={rootRef} className="mx-auto max-w-[1400px] px-6 py-24 md:px-12">
        <p className="font-ui text-xs tracking-[0.3em] text-[var(--ink-soft)]">
          CHAPTER ONE, PARAGRAPH THREE, WHILE YOU WATCH
        </p>
        <p className="reader-para relative mt-8 max-w-[52ch] !text-2xl md:!text-4xl" style={{ textIndent: 0 }}>
          {PASSAGE.map((piece, i) => {
            if (typeof piece === "string") return <span key={i}>{piece}</span>;
            wovenIndex++;
            const isSwapped = wovenIndex < swapped;
            const slipIndex = i;
            return (
              <span key={i} className="weave-slot">
                <span className={`weave-en ${isSwapped ? "weave-out" : ""}`} aria-hidden={isSwapped}>
                  {piece.en}
                </span>
                <span
                  className={`weave-ja woven ${isSwapped ? "weave-in" : ""}`}
                  role="button"
                  tabIndex={isSwapped ? 0 : -1}
                  aria-hidden={!isSwapped}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlip(slip === slipIndex ? null : slipIndex);
                  }}
                >
                  {piece.ruby ? (
                    <ruby>
                      {piece.ja}
                      <rt>{piece.ruby}</rt>
                    </ruby>
                  ) : (
                    piece.ja
                  )}
                </span>
                {slip === slipIndex && (
                  <span className="slip slip-pop font-ui absolute z-10 mt-2 block px-4 py-3 text-sm normal-case">
                    <span className="jp block text-lg text-[var(--indigo)]">
                      {piece.ja}
                      {piece.ruby && (
                        <span className="ml-2 text-xs text-[var(--ink-soft)]">{piece.ruby}</span>
                      )}
                    </span>
                    <span className="mt-1 block leading-snug">{piece.gloss}</span>
                    <span className="mt-1 block text-xs text-[var(--ink-soft)]">
                      in the text: &ldquo;{piece.en}&rdquo;
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </p>
        <div className="font-ui mt-10 flex items-center gap-6 text-sm text-[var(--ink-soft)]">
          <span>
            {swapped < SWAP_COUNT
              ? `${swapped} of ${SWAP_COUNT} words woven`
              : "Tap an indigo word - that popover is the whole dictionary you need."}
          </span>
          {swapped >= SWAP_COUNT && (
            <button
              className="text-[var(--indigo)]"
              onClick={() => {
                setSlip(null);
                setSwapped(0);
              }}
            >
              weave it again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
