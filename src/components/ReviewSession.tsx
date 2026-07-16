"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LexiconEntry, VocabEntry } from "@/lib/types";
import { praise } from "@/lib/format";

interface Example {
  before: string;
  word: string;
  after: string;
}

interface SessionWord extends VocabEntry {
  entry: LexiconEntry;
  example: Example | null;
  isNew: boolean;
}

interface SessionPayload {
  newWords: (VocabEntry & { entry: LexiconEntry; example: Example | null })[];
  dueWords: (VocabEntry & { entry: LexiconEntry; example: Example | null })[];
  done: boolean;
  cardsDoneThrough: number;
  error?: string;
}

const GRADES = [
  { rating: 1, label: "Again", key: "1", color: "var(--danger)" },
  { rating: 2, label: "Hard", key: "2", color: "var(--ink-soft)" },
  { rating: 3, label: "Good", key: "3", color: "var(--indigo)" },
  { rating: 4, label: "Easy", key: "4", color: "var(--ink-soft)" },
] as const;

interface ReviewSessionProps {
  slug: string;
  chapter: number;
  language: string;
}

export default function ReviewSession({ slug, chapter, language }: ReviewSessionProps) {
  const [queue, setQueue] = useState<SessionWord[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [seen, setSeen] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [freed, setFreed] = useState<Set<string>>(new Set());
  const [startedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    const res = await fetch(`/api/review/${slug}/${chapter}`);
    if (!res.ok) {
      setStatus("error");
      return;
    }
    const data: SessionPayload = await res.json();
    if (data.done) {
      setDone(true);
      setStatus("ready");
      return;
    }
    setQueue([
      ...data.dueWords.map((w) => ({ ...w, isNew: false })),
      ...data.newWords.map((w) => ({ ...w, isNew: true })),
    ]);
    setStatus("ready");
  }, [slug, chapter]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = queue[0];

  const grade = useCallback(
    async (rating: number) => {
      if (!current) return;
      setRevealed(false);
      setSeen((s) => s + 1);
      const rest = queue.slice(1);
      // A failed card repeats at the end of this session's queue.
      const next = rating === 1 ? [...rest, { ...current, isNew: false }] : rest;
      setQueue(next);
      if (rating === 1) setAgainCount((n) => n + 1);
      const res = await fetch("/api/review/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexemeId: current.id, book: slug, rating }),
      });
      const result = await res.json().catch(() => null);
      if (result?.known) {
        setFreed((s) => new Set(s).add(current.id));
      }
      if (next.length === 0) await load();
    },
    [current, queue, slug, load],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        void grade(Number(e.key));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, revealed, grade]);

  if (status === "loading") {
    return (
      <div className="mt-16">
        <div className="card-face mx-auto max-w-md px-8 py-12 text-center opacity-50">
          <p className="jp text-5xl text-[var(--ink-soft)]">...</p>
          <p className="font-ui mt-8 text-xs text-[var(--ink-soft)]">gathering your cards</p>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <p className="font-ui mt-24 text-center text-sm text-[var(--ink-soft)]">
        These words are still locked. Finish the earlier chapters&apos; flashcards first.
      </p>
    );
  }
  if (done) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const accuracy = seen > 0 ? Math.round(((seen - againCount) / seen) * 100) : null;
    return (
      <div className="mt-24 text-center">
        <p className="jp text-4xl text-[var(--indigo)]">{praise(language)}</p>
        <p className="mt-4 text-[var(--ink-soft)]">
          Chapter {chapter} words learned. Now read them in the wild.
        </p>
        {seen > 0 && (
          <div className="font-ui mx-auto mt-8 flex max-w-md justify-center gap-8 border-y border-[var(--line)] py-5 text-sm text-[var(--ink-soft)]">
            <span>
              <span className="block text-2xl text-[var(--ink)]">{seen}</span>cards
            </span>
            <span>
              <span className="block text-2xl text-[var(--ink)]">{minutes}m</span>time
            </span>
            {accuracy !== null && (
              <span>
                <span className="block text-2xl text-[var(--ink)]">{accuracy}%</span>recalled
              </span>
            )}
            {freed.size > 0 && (
              <span>
                <span className="block text-2xl text-[var(--indigo)]">{freed.size}</span>
                furigana-free
              </span>
            )}
          </div>
        )}
        <div className="font-ui mt-8 flex justify-center gap-6 text-sm">
          <Link href={`/read/${slug}/${chapter}`} className="text-[var(--indigo)]">
            read chapter {chapter}
          </Link>
          <Link href="/library" className="text-[var(--ink-soft)]">
            library
          </Link>
        </div>
      </div>
    );
  }
  if (!current) return null;

  return (
    <div className="mt-16">
      <p className="font-ui mb-6 text-center text-xs tracking-wide text-[var(--ink-soft)]">
        {queue.length} to go
        {current.isNew && <span className="ml-2 text-[var(--indigo)]">new word</span>}
      </p>

      <div className="card-face mx-auto max-w-md px-8 py-12 text-center">
        <p className="jp text-5xl leading-relaxed text-[var(--ink)]">
          {current.isNew && current.entry.reading && !revealed ? (
            <ruby>
              {current.entry.ja}
              <rt className="text-base text-[var(--ink-soft)]">{current.entry.reading}</rt>
            </ruby>
          ) : (
            current.entry.ja
          )}
        </p>

        {revealed ? (
          <div className="card-reveal mt-8 border-t border-[var(--line)] pt-6">
            {current.entry.reading && (
              <p className="jp text-xl text-[var(--ink-soft)]">{current.entry.reading}</p>
            )}
            <p className="mt-3 text-lg">{current.entry.gloss}</p>
            <p className="font-ui mt-2 text-xs text-[var(--ink-soft)]">
              {current.lemma} ({current.pos})
            </p>
            {current.example && (
              <p className="mt-5 border-t border-[var(--line)] pt-4 text-left text-sm leading-relaxed text-[var(--ink-soft)]">
                {current.example.before}
                <mark className="rounded bg-[var(--indigo-soft)] px-1 text-[var(--indigo)]">
                  {current.example.word}
                </mark>
                {current.example.after}
                <span className="font-ui mt-1 block text-xs opacity-70">
                  from chapter {current.introducedChapter}
                </span>
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="font-ui mt-10 rounded border border-[var(--line)] px-6 py-2 text-sm text-[var(--ink-soft)]"
          >
            show answer
          </button>
        )}
      </div>

      <p className="font-ui mt-6 text-center text-xs text-[var(--ink-soft)] opacity-60">
        {revealed ? "grade with 1 - 4" : "space to show the answer"}
      </p>

      {revealed && (
        <div className="mx-auto mt-4 flex max-w-md justify-center gap-3">
          {GRADES.map((g) => (
            <button
              key={g.rating}
              onClick={() => grade(g.rating)}
              className="grade-btn font-ui rounded border px-5 py-2 text-sm"
              style={{ borderColor: g.color, color: g.color }}
            >
              <span className="grade-label">
                {g.label} <span className="opacity-50">{g.key}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
