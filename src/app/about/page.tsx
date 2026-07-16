import type { Metadata } from "next";
import ProsePage from "@/components/ProsePage";

export const metadata: Metadata = { title: "about - weave" };

export default function AboutPage() {
  return (
    <ProsePage eyebrow="ABOUT" title="A reader that changes language under you">
      <p>
        weave is built on an old idea sometimes called the diglot weave: you
        learn to read a language by reading things you actually want to read,
        while the text quietly trades English words for their translations.
        Vocabulary arrives in context, at a pace your memory can carry, instead
        of in lists.
      </p>
      <p>
        Each chapter of a book introduces fifteen new words as flashcards,
        scheduled by FSRS - the spaced-repetition algorithm behind modern Anki.
        Finish the cards and the chapter opens with those words already woven
        in. Tap any woven word for its reading and meaning; every tap feeds
        back into your reviews. When a word&apos;s memory is strong enough, its
        pronunciation guide disappears.
      </p>
      <p>
        It was built in 2026 by Nate Sproul as a personal tool for learning to
        read Japanese, starting with <em>Alice&apos;s Adventures in Wonderland</em>.
        The pipeline is language-agnostic: any public-domain book can go on the
        loom, and other languages are a dictionary swap away.
      </p>
      <p className="muted">
        weave is a SproulTech project. It currently runs locally, for one
        reader at a time.
      </p>
    </ProsePage>
  );
}
