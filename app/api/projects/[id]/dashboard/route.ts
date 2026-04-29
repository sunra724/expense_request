import { NextResponse } from "next/server";
import { getDadareumDashboard } from "@/lib/db/dadareum";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dashboard = await getDadareumDashboard(Number(id));
  return NextResponse.json(dashboard);
}
