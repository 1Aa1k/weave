import Link from "next/link";
import { getChapter, getLexicon, getMeta } from "@/lib/books";
import { getUnlockedChapter, swapStates } from "@/lib/srs";
import ReaderView, { type WovenEntries } from "@/components/ReaderView";

export const dynamic = "force-dynamic";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  const index = Number(n);
  const meta = getMeta(slug);
  const unlocked = getUnlockedChapter(slug);

  if (!Number.isInteger(index) || index < 1 || index > meta.chapterCount) {
    return <p className="mt-24 text-center text-[var(--ink-soft)]">No such chapter.</p>;
  }
  if (index > unlocked) {
    return (
      <div className="mt-24 text-center text-[var(--ink-soft)]">
        <p>This chapter is still locked.</p>
        <p className="font-ui mt-3 text-sm">
          Finish the flashcards for chapter {unlocked} to unlock the next one.
        </p>
        <Link href="/" className="font-ui mt-6 inline-block text-sm text-[var(--indigo)]">
          back to the library
        </Link>
      </div>
    );
  }

  const chapter = getChapter(slug, index);
  const lexicon = getLexicon(slug);
  const states = swapStates(slug, index);

  const entries: WovenEntries = {};
  for (const [id, s] of states) {
    const lex = lexicon[id];
    if (lex) entries[id] = { ja: lex.ja, reading: lex.reading, gloss: lex.gloss, known: s.known };
  }

  return (
    <ReaderView
      chapter={chapter}
      entries={entries}
      bookTitle={meta.title}
      chapterCount={meta.chapterCount}
      unlocked={unlocked}
    />
  );
}
