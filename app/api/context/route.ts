import { NextResponse } from "next/server";
import { listOrganizations, listProjects } from "@/lib/db/organizations";

export async function GET() {
  const [organizations, projects] = await Promise.all([listOrganizations(), listProjects()]);
  return NextResponse.json({ organizations, projects });
}
