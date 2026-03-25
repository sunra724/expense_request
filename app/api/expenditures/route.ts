import { NextResponse } from "next/server";
import { createExpenditure, listExpenditures } from "@/lib/db/expenditures";
import type { ExpenditureInput } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listExpenditures());
}

export async function POST(request: Request) {
  const body = (await request.json()) as ExpenditureInput;
  const created = await createExpenditure(body);
  return NextResponse.json(created, { status: 201 });
}
