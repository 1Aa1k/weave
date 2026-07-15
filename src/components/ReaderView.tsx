"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Chapter, Token } from "@/lib/types";
import { jpChapter } from "@/lib/format";

export type WovenEntries = Record<
  string,
  { ja: string; reading: string; gloss: string; known: boolean }
>;

interface Slip {
  lexemeId: string;
  english: string;
  x: number;
  y: number;
}

interface ReaderViewProps {
  chapter: Chapter;
  entries: WovenEntries;
  bookTitle: string;
  chapterCount: number;
  cardsDoneThrough: number;
}

export default function ReaderView({
  chapter,
  entries,
  bookTitle,
  chapterCount,
  cardsDoneThrough,
}: ReaderViewProps) {
  const [slip, setSlip] = useState<Slip | null>(null);

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
      const rect = e.currentTarget.getBoundingClientRect();
      setSlip({
        lexemeId,
        english,
        x: Math.min(rect.left, window.innerWidth - 340),
        y: rect.bottom + 8,
      });
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
      <div className="relative mt-12 mb-10">
        <span className="chapter-ornament absolute -left-2 top-1 hidden md:block" aria-hidden>
          {jpChapter(chapter.index)}
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

      <article className="md:pl-14">
        {chapter.paragraphs.map((tokens, i) => (
          <p key={i} className="reader-para">
            {renderTokens(tokens, entries, openSlip)}
          </p>
        ))}
      </article>

      <footer className="font-ui mt-16 flex items-center justify-between border-t border-[var(--line)] pt-6 text-sm md:pl-14">
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
          style={{ left: slip.x, top: slip.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="jp text-xl text-[var(--indigo)]">
            {entry.ja}
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
          entry.ja
        ) : (
          <ruby>
            {entry.ja}
            <rt>{entry.reading}</rt>
          </ruby>
        )}
      </span>,
    );
  });
  if (plain) nodes.push(plain);
  return nodes;
}
