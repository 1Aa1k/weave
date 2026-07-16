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
  { text: "историей", ruby: "istóriyey", lang: "ru" },
  { text: "story", ruby: "", lang: "en" },
  { text: "故事", ruby: "gùshi", lang: "zh" },
  { text: "story", ruby: "", lang: "en" },
  { text: "historia", ruby: "", lang: "es" },
  { text: "story", ruby: "", lang: "en" },
  { text: "이야기", ruby: "iyagi", lang: "ko" },
] as const;

/* One drifting word per language the loom could hold. */
const FLOATERS = [
  { char: "物語", size: "8rem", left: "72%", top: "6%", dur: "67s", delay: "0s" },
  { char: "читать", size: "3.4rem", left: "84%", top: "58%", dur: "53s", delay: "-12s" },
  { char: "palabra", size: "3rem", left: "6%", top: "70%", dur: "71s", delay: "-30s" },
  { char: "故事", size: "2.6rem", left: "58%", top: "84%", dur: "59s", delay: "-8s" },
  { char: "λέξη", size: "4.5rem", left: "3%", top: "12%", dur: "63s", delay: "-40s" },
  { char: "책", size: "8rem", left: "38%", top: "40%", dur: "77s", delay: "-22s" },
  { char: "كلمة", size: "4rem", left: "90%", top: "24%", dur: "49s", delay: "-5s" },
  { char: "mot", size: "3rem", left: "22%", top: "92%", dur: "61s", delay: "-33s" },
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
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    let clear: ReturnType<typeof setTimeout>;
    const tick = setInterval(() => {
      setIndex((i) => {
        setPrev(i);
        return (i + 1) % LOOM_WORDS.length;
      });
      clear = setTimeout(() => setPrev(null), 400);
    }, 2400);
    return () => {
      clearInterval(tick);
      clearTimeout(clear);
    };
  }, []);

  return (
    <span className="loom-word">
      {LOOM_WORDS.map((word, i) => {
        const foreign = word.lang !== "en";
        const state = i === index ? "loom-arriving" : i === prev ? "loom-leaving" : "";
        const body = word.ruby ? (
          <ruby>
            {word.text}
            <rt>{word.ruby}</rt>
          </ruby>
        ) : (
          word.text
        );
        return (
          <span key={i} className={`loom-item ${state}`} lang={word.lang} aria-hidden={i !== index}>
            {foreign ? <span className="jp text-[var(--indigo)]">{body}</span> : body}
          </span>
        );
      })}
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
            for the language you&apos;re learning, fifteen per chapter. You keep
            reading. The book stops being English before you notice.
          </p>
          <div className="font-ui mt-10 flex flex-wrap items-center gap-5 text-sm">
            <Link
              href="/library"
              className="rounded bg-[var(--vermilion)] px-6 py-3 text-[#f4eee1]"
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
            num="01"
            title="Fifteen words, then the chapter"
            body="Each chapter starts as flashcards: its fifteen most useful words, scheduled by FSRS, the same algorithm behind Anki. Only when the cards are done does the chapter open - so every woven word is one you've already met."
          />
          <Step
            num="02"
            title="Read them in the wild"
            body="The chapter arrives with those words already woven in, indigo against the English, pronunciation printed above. Tap one and a paper slip gives you the reading and the meaning. Every tap is remembered and works its way back into your reviews."
          />
          <Step
            num="03"
            title="The crutches fall away"
            body="Old words keep returning as reviews alongside each chapter's new ones. When a word's memory is strong enough, its pronunciation guide disappears. Chapter one gives you fifteen words; chapter twelve is carrying one hundred eighty."
          />
        </div>
      </section>

      <footer className="mx-auto max-w-3xl px-6 pb-16">
        <div className="flex items-baseline justify-between border-t border-[var(--line)] pt-6">
          <p className="font-ui text-xs text-[var(--ink-soft)]">
            Built for one impatient reader. Japanese on the loom first; any
            language it can hold, eventually.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logomark.svg" alt="" width={26} height={26} aria-hidden />
        </div>
      </footer>
    </div>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] items-start gap-6 border-t border-[var(--line)] pt-8">
      <span className="font-ui pt-1.5 text-sm tracking-[0.2em] text-[var(--vermilion)]" aria-hidden>
        {num}
      </span>
      <div>
        <h2 className="text-2xl">{title}</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-[var(--ink-soft)]">{body}</p>
      </div>
    </div>
  );
}
