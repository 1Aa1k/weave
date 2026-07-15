import Link from "next/link";
import { listBooks } from "@/lib/books";
import { getCardsDoneThrough } from "@/lib/srs";
import { jpChapter } from "@/lib/format";

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
    <div className="mt-10">
      {books.map((book) => {
        const cardsDone = getCardsDoneThrough(book.slug);
        return (
          <section key={book.slug} className="mb-14">
            <h1 className="mb-1 text-3xl">{book.title}</h1>
            <p className="font-ui mb-6 text-sm text-[var(--ink-soft)]">
              {cardsDone >= book.chapterCount
                ? "finished"
                : `chapter ${Math.min(cardsDone + 1, book.chapterCount)} of ${book.chapterCount}`}
            </p>
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
                      {jpChapter(n)}
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
