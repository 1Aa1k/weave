import { NextResponse } from "next/server";
import { recordClick } from "@/lib/srs";

export async function POST(req: Request) {
  const body = await req.json();
  const { lexemeId, book, chapter } = body ?? {};
  if (
    typeof lexemeId !== "string" ||
    typeof book !== "string" ||
    !Number.isInteger(chapter) ||
    chapter < 1
  ) {
    return NextResponse.json({ error: "bad click payload" }, { status: 400 });
  }
  recordClick(lexemeId, book, chapter);
  return NextResponse.json({ ok: true });
}
