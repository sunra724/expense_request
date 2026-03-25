import { NextResponse } from "next/server";
import { deleteProposal, getProposal, updateProposal } from "@/lib/db/proposals";
import type { ProposalInput } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getProposal(Number(id));
  return item ? NextResponse.json(item) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as ProposalInput;
  const updated = await updateProposal(Number(id), body);
  return updated ? NextResponse.json(updated) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteProposal(Number(id));
  return NextResponse.json({ ok: true });
}
