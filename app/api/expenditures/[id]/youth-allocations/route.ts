import { NextResponse } from "next/server";
import {
  listExpenditureYouthAllocations,
  replaceExpenditureYouthAllocations,
} from "@/lib/db/dadareum";
import type { ExpenditureYouthAllocationInput } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(await listExpenditureYouthAllocations(Number(id)));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { allocations?: ExpenditureYouthAllocationInput[] };
  const allocations = await replaceExpenditureYouthAllocations(Number(id), body.allocations ?? []);
  return NextResponse.json(allocations);
}
