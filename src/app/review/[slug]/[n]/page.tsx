import ReviewSession from "@/components/ReviewSession";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  return <ReviewSession slug={slug} chapter={Number(n)} />;
}
