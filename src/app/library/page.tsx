import Link from "next/link";
import { listBooks, getVocab } from "@/lib/books";
import { bookStats, getCardsDoneThrough } from "@/lib/srs";
import { chapterOrnament } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Library() {
  const books = listBooks();

  if (books.length === 0) {
    return (
      <div className="mt-24 text-center text-[var(--ink-soft)]">
        <p className="text-lg">No books yet.</p>
        <p className="font-ui mt-3 text-sm">
          Run the ingest pipeline: npx tsx scripts/ingest.ts book.txt slug &quot;Title&quot; freq.txt
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-4xl px-6">
      {books.map((book) => {
        const cardsDone = getCardsDoneThrough(book.slug);
        const stats = bookStats(book.slug);
        const totalWords = getVocab(book.slug).length;
        const finished = cardsDone >= book.chapterCount;
        const continueHref = finished
          ? stats.due > 0
            ? `/review/${book.slug}/${book.chapterCount}`
            : `/read/${book.slug}/${book.chapterCount}`
          : `/review/${book.slug}/${cardsDone + 1}`;
        return (
          <section key={book.slug} className="mb-16">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="mb-1 text-3xl">{book.title}</h1>
              <Link
                href={continueHref}
                className="font-ui rounded bg-[var(--indigo)] px-4 py-1.5 text-xs font-medium text-[var(--accent-ink)]"
              >
                {finished ? (stats.due > 0 ? `review ${stats.due} due` : "read again") : "continue"}
              </Link>
            </div>
            <p className="font-ui mb-3 text-sm text-[var(--ink-soft)]">
              {finished
                ? "finished"
                : `chapter ${Math.min(cardsDone + 1, book.chapterCount)} of ${book.chapterCount}`}
              {" · "}
              {stats.met} of {totalWords} words met
              {stats.due > 0 && (
                <span className="ml-2 rounded bg-[var(--indigo-soft)] px-2 py-0.5 text-xs text-[var(--indigo)]">
                  {stats.due} due
                </span>
              )}
            </p>
            <div className="mb-6 h-px w-full bg-[var(--line)]">
              <div
                className="h-px bg-[var(--indigo)]"
                style={{ width: `${Math.round((cardsDone / book.chapterCount) * 100)}%` }}
              />
            </div>
            <ol>
              {book.chapterTitles.map((title, i) => {
                const n = i + 1;
                const state = n <= cardsDone ? "readable" : n === cardsDone + 1 ? "next" : "locked";
                return (
                  <li
                    key={n}
                    className="flex items-baseline gap-4 border-b border-[var(--line)] py-3"
                  >
                    <span className="jp w-14 shrink-0 text-sm text-[var(--ink-soft)]">
                      {chapterOrnament(book.language, n)}
                    </span>
                    {state === "locked" ? (
                      <span className="text-[var(--ink-soft)] opacity-60">{title}</span>
                    ) : (
                      <Link
                        href={state === "next" ? `/review/${book.slug}/${n}` : `/read/${book.slug}/${n}`}
                        className={state === "next" ? "text-[var(--indigo)]" : ""}
                      >
                        {title}
                      </Link>
                    )}
                    <span className="font-ui ml-auto text-xs tracking-wide text-[var(--ink-soft)]">
                      {state === "readable" ? "read" : state === "next" ? "learn words" : "locked"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
