import { NextResponse } from "next/server";
import { deleteExpenditure, getExpenditure, updateExpenditure } from "@/lib/db/expenditures";
import type { ExpenditureInput } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getExpenditure(Number(id));
  return item ? NextResponse.json(item) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as ExpenditureInput;
  const updated = await updateExpenditure(Number(id), body);
  return updated ? NextResponse.json(updated) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteExpenditure(Number(id));
  return NextResponse.json({ ok: true });
}
