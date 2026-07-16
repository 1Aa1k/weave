import { NextResponse } from "next/server";
import { KNOWN_STABILITY_DAYS, rateCard } from "@/lib/srs";
import type { Grade } from "ts-fsrs";

export async function POST(req: Request) {
  const body = await req.json();
  const { lexemeId, book, rating } = body ?? {};
  if (
    typeof lexemeId !== "string" ||
    typeof book !== "string" ||
    ![1, 2, 3, 4].includes(rating)
  ) {
    return NextResponse.json({ error: "bad answer payload" }, { status: 400 });
  }
  const card = rateCard(lexemeId, book, rating as Grade);
  return NextResponse.json({
    due: card.due,
    state: card.state,
    stability: card.stability,
    known: card.state === 2 && card.stability >= KNOWN_STABILITY_DAYS,
  });
}
