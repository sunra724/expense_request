import { NextResponse } from "next/server";
import { getProjectBudgetSetup, saveProjectBudgetLines } from "@/lib/db/dadareum";
import type { ProjectBudgetLineInput } from "@/lib/types";

type BudgetLinesPayload = {
  lines?: ProjectBudgetLineInput[];
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await getProjectBudgetSetup(Number(id)));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as BudgetLinesPayload;
  const updated = await saveProjectBudgetLines(Number(id), body.lines ?? []);
  return NextResponse.json(updated);
}
