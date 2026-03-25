import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings";
import type { StampSettings } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<StampSettings>;
  return NextResponse.json(await updateSettings(body));
}
