import { NextResponse } from "next/server";
import { deleteProjectYouth, updateProjectYouth } from "@/lib/db/dadareum";
import type { ProjectYouthInput } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as ProjectYouthInput;
  const updated = await updateProjectYouth(Number(id), body);
  return updated ? NextResponse.json(updated) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteProjectYouth(Number(id));
  return NextResponse.json({ ok: true });
}
