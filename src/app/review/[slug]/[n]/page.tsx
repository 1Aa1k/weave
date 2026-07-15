import ReviewSession from "@/components/ReviewSession";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  return (
    <div className="mx-auto max-w-3xl px-6">
      <ReviewSession slug={slug} chapter={Number(n)} />
    </div>
  );
}
