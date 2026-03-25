import { NextResponse } from "next/server";
import { batchExpenditures } from "@/lib/db/expenditures";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter(Boolean);
  return NextResponse.json(await batchExpenditures(ids));
}
