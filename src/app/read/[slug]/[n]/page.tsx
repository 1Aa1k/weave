import Link from "next/link";
import { getChapter, getLexicon, getMeta, getVocab } from "@/lib/books";
import { getCardsDoneThrough, swapStates } from "@/lib/srs";
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
  const cardsDone = getCardsDoneThrough(slug);

  if (!Number.isInteger(index) || index < 1 || index > meta.chapterCount) {
    return <p className="mt-24 text-center text-[var(--ink-soft)]">No such chapter.</p>;
  }
  if (index > cardsDone) {
    const next = cardsDone + 1;
    return (
      <div className="mx-auto mt-24 max-w-3xl px-6 text-center text-[var(--ink-soft)]">
        <p>Learn the words before you read.</p>
        <p className="font-ui mt-3 text-sm">
          {index === next
            ? `Chapter ${index} opens once you finish its flashcards.`
            : `You are on chapter ${next}. Finish each chapter's flashcards to move forward.`}
        </p>
        <div className="font-ui mt-6 flex justify-center gap-6 text-sm">
          <Link href={`/review/${slug}/${next}`} className="text-[var(--indigo)]">
            do chapter {next} flashcards
          </Link>
          <Link href="/" className="text-[var(--ink-soft)]">
            library
          </Link>
        </div>
      </div>
    );
  }

  const chapter = getChapter(slug, index);
  const lexicon = getLexicon(slug);
  const states = swapStates(slug, index);

  const entries: WovenEntries = {};
  for (const [id, s] of states) {
    const lex = lexicon[id];
    if (lex) entries[id] = { word: lex.word, reading: lex.reading, gloss: lex.gloss, known: s.known };
  }

  const knownCount = Object.values(entries).filter((e) => e.known).length;
  const nextNewCount = getVocab(slug).filter((v) => v.introducedChapter === index + 1).length;

  return (
    <div className="mx-auto max-w-3xl px-6 lg:max-w-[1200px]">
      <ReaderView
        chapter={chapter}
        entries={entries}
        bookTitle={meta.title}
        language={meta.language}
        chapterCount={meta.chapterCount}
        cardsDoneThrough={cardsDone}
        knownCount={knownCount}
        nextNewCount={nextNewCount}
      />
    </div>
  );
}
