import ReviewSession from "@/components/ReviewSession";
import { getMeta } from "@/lib/books";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  let language = "en";
  try {
    language = getMeta(slug).language;
  } catch {
    // unknown book: ReviewSession will surface the error state
  }
  return (
    <div className="mx-auto max-w-3xl px-6">
      <ReviewSession slug={slug} chapter={Number(n)} language={language} />
    </div>
  );
}
