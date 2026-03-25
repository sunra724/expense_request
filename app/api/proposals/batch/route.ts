import { NextResponse } from "next/server";
import { batchProposals } from "@/lib/db/proposals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter(Boolean);
  return NextResponse.json(await batchProposals(ids));
}
