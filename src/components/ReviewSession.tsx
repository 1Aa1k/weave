"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LexiconEntry, VocabEntry } from "@/lib/types";

interface SessionWord extends VocabEntry {
  entry: LexiconEntry;
  isNew: boolean;
}

interface SessionPayload {
  newWords: (VocabEntry & { entry: LexiconEntry })[];
  dueWords: (VocabEntry & { entry: LexiconEntry })[];
  done: boolean;
  cardsDoneThrough: number;
  error?: string;
}

const GRADES = [
  { rating: 1, label: "Again", key: "1", color: "var(--again)" },
  { rating: 2, label: "Hard", key: "2", color: "var(--ink-soft)" },
  { rating: 3, label: "Good", key: "3", color: "var(--good)" },
  { rating: 4, label: "Easy", key: "4", color: "var(--indigo)" },
] as const;

interface ReviewSessionProps {
  slug: string;
  chapter: number;
}

export default function ReviewSession({ slug, chapter }: ReviewSessionProps) {
  const [queue, setQueue] = useState<SessionWord[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [seen, setSeen] = useState(0);
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
      await fetch("/api/review/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexemeId: current.id, book: slug, rating }),
      });
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
    return <p className="font-ui mt-24 text-center text-sm text-[var(--ink-soft)]">loading...</p>;
  }
  if (status === "error") {
    return (
      <p className="font-ui mt-24 text-center text-sm text-[var(--ink-soft)]">
        These words are still locked. Finish the earlier chapters&apos; flashcards first.
      </p>
    );
  }
  if (done) {
    return (
      <div className="mt-24 text-center">
        <p className="jp text-4xl text-[var(--indigo)]">よくできました</p>
        <p className="mt-4 text-[var(--ink-soft)]">
          Chapter {chapter} words learned{seen > 0 ? ` after ${seen} cards` : ""}. Now read them
          in the wild.
        </p>
        <div className="font-ui mt-8 flex justify-center gap-6 text-sm">
          <Link href={`/read/${slug}/${chapter}`} className="text-[var(--indigo)]">
            read chapter {chapter}
          </Link>
          <Link href="/" className="text-[var(--ink-soft)]">
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
          <div className="mt-8 border-t border-[var(--line)] pt-6">
            {current.entry.reading && (
              <p className="jp text-xl text-[var(--ink-soft)]">{current.entry.reading}</p>
            )}
            <p className="mt-3 text-lg">{current.entry.gloss}</p>
            <p className="font-ui mt-2 text-xs text-[var(--ink-soft)]">
              {current.lemma} ({current.pos})
            </p>
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

      {revealed && (
        <div className="mx-auto mt-6 flex max-w-md justify-center gap-3">
          {GRADES.map((g) => (
            <button
              key={g.rating}
              onClick={() => grade(g.rating)}
              className="font-ui rounded border px-5 py-2 text-sm"
              style={{ borderColor: g.color, color: g.color }}
            >
              {g.label} <span className="opacity-50">{g.key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
