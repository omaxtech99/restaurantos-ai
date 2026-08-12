import { NextResponse } from "next/server";

import { getMenuItems } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ items: getMenuItems() });
}
