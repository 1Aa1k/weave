import { NextResponse } from "next/server";
import { getLexicon } from "@/lib/books";
import { buildSession, getCardsDoneThrough } from "@/lib/srs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; n: string }> },
) {
  const { slug, n } = await params;
  const index = Number(n);
  try {
    // Words come first: the next reviewable chapter is one past the last done.
    if (index > getCardsDoneThrough(slug) + 1) {
      return NextResponse.json({ error: "chapter locked" }, { status: 403 });
    }
    const session = buildSession(slug, index);
    const lexicon = getLexicon(slug);
    const withEntry = (words: typeof session.newWords) =>
      words
        .filter((w) => lexicon[w.id])
        .map((w) => ({ ...w, entry: lexicon[w.id] }));
    return NextResponse.json({
      newWords: withEntry(session.newWords),
      dueWords: withEntry(session.dueWords),
      done: session.done,
      cardsDoneThrough: session.cardsDoneThrough,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 });
  }
}
