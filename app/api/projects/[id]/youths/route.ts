import { NextResponse } from "next/server";
import { createProjectYouth, listProjectYouths } from "@/lib/db/dadareum";
import type { ProjectYouthInput } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(await listProjectYouths(Number(id)));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as ProjectYouthInput;
  const created = await createProjectYouth({ ...body, project_id: Number(id) });
  return NextResponse.json(created, { status: 201 });
}
