"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WeavingPassage from "./WeavingPassage";

/** The departure board: word-cards that flip between English and the loom's languages. */
const FLAPS = [
  { en: "read", to: "読む", note: "yomu · Japanese", period: 4200, delay: 0 },
  { en: "night", to: "ночь", note: "noch · Russian", period: 5100, delay: 900 },
  { en: "story", to: "故事", note: "gùshi · Chinese", period: 4600, delay: 1700 },
  { en: "friend", to: "amigo", note: "Spanish", period: 5500, delay: 600 },
  { en: "begin", to: "시작", note: "sijak · Korean", period: 4900, delay: 2300 },
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

function Flap({ en, to, note, period, delay }: (typeof FLAPS)[number]) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFlipped(true);
      return;
    }
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      setFlipped(true);
      interval = setInterval(() => setFlipped((f) => !f), period);
    }, 1000 + delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [period, delay]);

  return (
    <div className="flap-row">
      <div className={`flap ${flipped ? "flap-flipped" : ""}`}>
        <span className="flap-face flap-front">{en}</span>
        <span className="flap-face flap-back jp">{to}</span>
      </div>
      <span className={`flap-note font-ui ${flipped ? "opacity-100" : "opacity-0"}`}>{note}</span>
    </div>
  );
}

function FlapBoard() {
  return (
    <div className="flap-board" aria-label="English words flipping into other languages">
      {FLAPS.map((f) => (
        <Flap key={f.en} {...f} />
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <section className="relative overflow-hidden">
        <Floaters />
        <div className="relative mx-auto grid max-w-5xl items-center gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_0.95fr] md:pt-24">
          <div>
            <p className="font-ui text-xs tracking-[0.3em] text-[var(--ink-soft)]">
              A READER THAT CHANGES LANGUAGE UNDER YOU
            </p>
            <h1 className="mt-8 text-4xl leading-[1.16] md:text-5xl">
              Start the book in English.
              <br />
              <span className="text-[var(--indigo)]">Finish it in another language.</span>
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-[var(--ink-soft)]">
              weave swaps English words for the language you&apos;re learning,
              fifteen per chapter, while you just keep reading.
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
          <FlapBoard />
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
