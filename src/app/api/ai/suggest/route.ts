import { NextResponse } from "next/server";

import { suggestMenuPairing } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { dish?: string };

  if (!body.dish?.trim()) {
    return NextResponse.json({ error: "dish is required" }, { status: 400 });
  }

  const suggestion = suggestMenuPairing(body.dish);
  return NextResponse.json({ dish: body.dish, suggestion });
}
