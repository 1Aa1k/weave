"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeavingPassage from "./WeavingPassage";

/**
 * The marquee: one concept cycling through languages, the way weave
 * swaps words mid-sentence. Readings render as ruby above non-Latin forms.
 */
const LOOM_WORDS = [
  { text: "story", ruby: "", lang: "en" },
  { text: "物語", ruby: "ものがたり", lang: "ja" },
  { text: "story", ruby: "", lang: "en" },
  { text: "故事", ruby: "gùshi", lang: "zh" },
  { text: "story", ruby: "", lang: "en" },
  { text: "historia", ruby: "", lang: "es" },
] as const;

const FLOATERS = [
  { char: "織", size: "11rem", left: "72%", top: "6%", dur: "67s", delay: "0s" },
  { char: "読", size: "7rem", left: "85%", top: "58%", dur: "53s", delay: "-12s" },
  { char: "言葉", size: "3.2rem", left: "8%", top: "70%", dur: "71s", delay: "-30s" },
  { char: "物語", size: "2.4rem", left: "58%", top: "82%", dur: "59s", delay: "-8s" },
  { char: "夢", size: "5rem", left: "3%", top: "12%", dur: "63s", delay: "-40s" },
  { char: "本", size: "8.5rem", left: "38%", top: "40%", dur: "77s", delay: "-22s" },
  { char: "字", size: "4rem", left: "90%", top: "26%", dur: "49s", delay: "-5s" },
  { char: "心", size: "3rem", left: "22%", top: "90%", dur: "61s", delay: "-33s" },
] as const;

function Floaters() {
  return (
    <div className="floaters" aria-hidden>
      {FLOATERS.map((f) => (
        <span
          key={f.char + f.left}
          className="floater jp"
          style={{
            fontSize: f.size,
            left: f.left,
            top: f.top,
            animationDuration: f.dur,
            animationDelay: f.delay,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}

function WordLoom() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const tick = setInterval(() => {
      setLeaving(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % LOOM_WORDS.length);
        setLeaving(false);
      }, 380);
    }, 2400);
    return () => clearInterval(tick);
  }, []);

  const word = LOOM_WORDS[index];
  const foreign = word.lang !== "en";
  return (
    <span className={`loom-word ${leaving ? "loom-leaving" : "loom-arriving"}`} lang={word.lang}>
      {foreign ? (
        <span className={`jp ${foreign ? "text-[var(--indigo)]" : ""}`}>
          {word.ruby ? (
            <ruby>
              {word.text}
              <rt>{word.ruby}</rt>
            </ruby>
          ) : (
            word.text
          )}
        </span>
      ) : (
        word.text
      )}
    </span>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <section className="relative overflow-hidden">
        <Floaters />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-16 md:pt-24">
          <p className="font-ui text-xs tracking-[0.3em] text-[var(--ink-soft)]">
            A READER THAT CHANGES LANGUAGE UNDER YOU
          </p>
          <h1 className="mt-8 max-w-[21ch] text-4xl leading-[1.22] md:text-6xl">
            Learn a language the way you learned your first one - inside a{" "}
            <WordLoom />
          </h1>
          <p className="mt-10 max-w-md text-lg leading-relaxed text-[var(--ink-soft)]">
            weave takes a book you want to read and quietly swaps English words
            for Japanese, fifteen per chapter. You keep reading. The book stops
            being English before you notice.
          </p>
          <div className="font-ui mt-10 flex flex-wrap items-center gap-5 text-sm">
            <Link
              href="/library"
              className="rounded bg-[var(--indigo)] px-6 py-3 text-[var(--paper)]"
            >
              Open the library
            </Link>
            <a href="#demo" className="text-[var(--indigo)]">
              watch a sentence change
            </a>
          </div>
        </div>
      </section>

      <WeavingPassage />

      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="grid gap-14">
          <Step
            kanji="一"
            title="Fifteen words, then the chapter"
            body="Each chapter starts as flashcards: its fifteen most useful words, scheduled by FSRS, the same algorithm behind Anki. Only when the cards are done does the chapter open - so every woven word is one you've already met."
          />
          <Step
            kanji="二"
            title="Read them in the wild"
            body="The chapter arrives with those words already in Japanese, indigo against the English, furigana above. Tap one and a paper slip gives you the reading and the meaning. Every tap is remembered and works its way back into your reviews."
          />
          <Step
            kanji="三"
            title="The crutches fall away"
            body="Old words keep returning as reviews alongside each chapter's new ones. When a word's memory is strong enough, its furigana disappears. Chapter one gives you fifteen words; chapter twelve is carrying one hundred eighty."
          />
        </div>
      </section>

      <footer className="mx-auto max-w-3xl px-6 pb-16">
        <div className="flex items-baseline justify-between border-t border-[var(--line)] pt-6">
          <p className="font-ui text-xs text-[var(--ink-soft)]">
            Built for one impatient reader. Japanese first; any language the
            loom can hold, eventually.
          </p>
          <span className="hanko jp" aria-hidden>
            織
          </span>
        </div>
      </footer>
    </div>
  );
}

function Step({ kanji, title, body }: { kanji: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] items-start gap-6 border-t border-[var(--line)] pt-8">
      <span className="jp text-4xl text-[var(--indigo)] opacity-80" aria-hidden>
        {kanji}
      </span>
      <div>
        <h2 className="text-2xl">{title}</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-[var(--ink-soft)]">{body}</p>
      </div>
    </div>
  );
}
