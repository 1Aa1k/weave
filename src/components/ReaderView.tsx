"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Chapter, Token } from "@/lib/types";
import { chapterOrnament, readingName } from "@/lib/format";

export type WovenEntries = Record<
  string,
  { word: string; reading: string; gloss: string; known: boolean }
>;

interface Slip {
  lexemeId: string;
  english: string;
  x: number;
  y: number;
  /** Render above the word when it sits too close to the viewport bottom. */
  above: boolean;
}

interface Pin {
  lexemeId: string;
  english: string;
}

interface ReaderViewProps {
  chapter: Chapter;
  entries: WovenEntries;
  bookTitle: string;
  language: string;
  chapterCount: number;
  cardsDoneThrough: number;
  knownCount: number;
  nextNewCount: number;
}

const MAX_PINS = 6;
const MARGIN_BREAKPOINT = 1024;

export default function ReaderView({
  chapter,
  entries,
  bookTitle,
  language,
  chapterCount,
  cardsDoneThrough,
  knownCount,
  nextNewCount,
}: ReaderViewProps) {
  const [slip, setSlip] = useState<Slip | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    if (!slip) return;
    const close = () => setSlip(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("scroll", close, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("scroll", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [slip]);

  const openSlip = useCallback(
    (e: React.MouseEvent<HTMLElement>, lexemeId: string, english: string) => {
      e.stopPropagation();
      // Wide screens pin the word into the living margin; small screens float a slip.
      if (window.innerWidth >= MARGIN_BREAKPOINT) {
        setPins((prev) => {
          const rest = prev.filter((p) => p.lexemeId !== lexemeId);
          return [{ lexemeId, english }, ...rest].slice(0, MAX_PINS);
        });
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const above = rect.bottom + 190 > window.innerHeight;
        setSlip({
          lexemeId,
          english,
          x: Math.min(rect.left, window.innerWidth - 340),
          y: above ? rect.top - 8 : rect.bottom + 8,
          above,
        });
      }
      void fetch("/api/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexemeId, book: chapter.book, chapter: chapter.index }),
      });
    },
    [chapter.book, chapter.index],
  );

  const wovenCount = Object.keys(entries).length;
  const entry = slip ? entries[slip.lexemeId] : null;

  return (
    <div onClick={() => setSlip(null)}>
      <div className="relative mt-12 mb-10 lg:max-w-3xl">
        <span className="chapter-ornament absolute -left-2 top-1 hidden md:block" lang={language} aria-hidden>
          {chapterOrnament(language, chapter.index)}
        </span>
        <div className="md:pl-14">
          <p className="font-ui text-xs tracking-[0.2em] text-[var(--ink-soft)] uppercase">
            {bookTitle}
          </p>
          <h1 className="mt-2 text-3xl">{chapter.title}</h1>
          <p className="font-ui mt-2 text-xs text-[var(--ink-soft)]">
            {wovenCount} words woven into this chapter
          </p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <div className="min-w-0 lg:max-w-3xl">
          <article className="md:pl-14">
            {chapter.paragraphs.map((tokens, i) => (
              <p key={i} className="reader-para">
                {renderTokens(tokens, entries, openSlip)}
              </p>
            ))}
          </article>
        </div>

        <aside className="hidden lg:block" aria-label="reading margin">
          <div className="sticky top-8 max-h-[calc(100vh-4rem)] space-y-4 overflow-y-auto pb-4">
            {pins.length === 0 ? (
              <p className="font-ui border-l border-[var(--line)] pl-4 text-xs leading-relaxed text-[var(--ink-soft)]">
                Tap an indigo word and it pins here, so the text stays clear.
              </p>
            ) : (
              pins.map((pin) => {
                const entry = entries[pin.lexemeId];
                if (!entry) return null;
                return (
                  <div key={pin.lexemeId} className="slip slip-pop relative px-4 py-3">
                    <button
                      className="font-ui absolute right-2.5 top-2 text-xs text-[var(--ink-soft)]"
                      aria-label={`unpin ${entry.word}`}
                      onClick={() =>
                        setPins((prev) => prev.filter((p) => p.lexemeId !== pin.lexemeId))
                      }
                    >
                      x
                    </button>
                    <p className="jp text-xl text-[var(--indigo)]">
                      {entry.word}
                      {entry.reading && (
                        <span className="ml-2 text-sm text-[var(--ink-soft)]">{entry.reading}</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm leading-snug">{entry.gloss}</p>
                    <p className="font-ui mt-1.5 text-xs text-[var(--ink-soft)]">
                      in the text: &ldquo;{pin.english}&rdquo;
                    </p>
                  </div>
                );
              })
            )}

            <div className="font-ui border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--ink-soft)]">
              <p>
                {wovenCount} words woven into this chapter
                {knownCount > 0 && <> · {knownCount} already {readingName(language)}-free</>}
              </p>
              {chapter.index < chapterCount && nextNewCount > 0 && (
                <p className="mt-2">
                  next: {nextNewCount} new words wait in chapter {chapter.index + 1}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <footer className="font-ui mt-16 flex items-center justify-between border-t border-[var(--line)] pt-6 text-sm md:pl-14 lg:max-w-3xl">
        {chapter.index > 1 ? (
          <Link href={`/read/${chapter.book}/${chapter.index - 1}`} className="text-[var(--ink-soft)]">
            previous chapter
          </Link>
        ) : (
          <span />
        )}
        {chapter.index < chapterCount ? (
          <Link
            href={`/review/${chapter.book}/${chapter.index + 1}`}
            className="rounded border border-[var(--indigo)] px-4 py-2 text-[var(--indigo)]"
          >
            Learn chapter {chapter.index + 1} words
          </Link>
        ) : (
          <Link
            href={`/review/${chapter.book}/${chapter.index}`}
            className="rounded border border-[var(--indigo)] px-4 py-2 text-[var(--indigo)]"
          >
            Review words
          </Link>
        )}
        {chapter.index < chapterCount && cardsDoneThrough > chapter.index ? (
          <Link href={`/read/${chapter.book}/${chapter.index + 1}`} className="text-[var(--ink-soft)]">
            next chapter
          </Link>
        ) : (
          <span className="text-[var(--ink-soft)] opacity-60">
            {chapter.index < chapterCount ? "next needs its flashcards" : "last chapter"}
          </span>
        )}
      </footer>

      {slip && entry && (
        <div
          className="slip slip-pop fixed z-50 px-4 py-3"
          style={{
            left: slip.x,
            top: slip.y,
            transform: slip.above ? "translateY(-100%)" : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="jp text-xl text-[var(--indigo)]">
            {entry.word}
            {entry.reading && (
              <span className="ml-2 text-sm text-[var(--ink-soft)]">{entry.reading}</span>
            )}
          </p>
          <p className="mt-1 text-sm leading-snug">{entry.gloss}</p>
          <p className="font-ui mt-2 text-xs text-[var(--ink-soft)]">
            in the text: &ldquo;{slip.english}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

function renderTokens(
  tokens: Token[],
  entries: WovenEntries,
  openSlip: (e: React.MouseEvent<HTMLElement>, lexemeId: string, english: string) => void,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let plain = "";
  tokens.forEach((tok, i) => {
    const entry = tok.l ? entries[tok.l] : undefined;
    if (!entry) {
      plain += tok.s;
      return;
    }
    if (plain) {
      nodes.push(plain);
      plain = "";
    }
    const lexemeId = tok.l as string;
    nodes.push(
      <span
        key={i}
        className="woven"
        role="button"
        tabIndex={0}
        onClick={(e) => openSlip(e, lexemeId, tok.s)}
        onKeyDown={(e) => {
          if (e.key === "Enter") openSlip(e as unknown as React.MouseEvent<HTMLElement>, lexemeId, tok.s);
        }}
      >
        {entry.known || !entry.reading ? (
          entry.word
        ) : (
          <ruby>
            {entry.word}
            <rt>{entry.reading}</rt>
          </ruby>
        )}
      </span>,
    );
  });
  if (plain) nodes.push(plain);
  return nodes;
}
