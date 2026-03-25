import { NextResponse } from "next/server";
import { createProposal, listProposals } from "@/lib/db/proposals";
import type { ProposalInput } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listProposals());
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProposalInput;
  const created = await createProposal(body);
  return NextResponse.json(created, { status: 201 });
}
