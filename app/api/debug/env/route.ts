import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const keys = [
  "GOOGLE_CALENDAR_ICAL_URL",
  "CALENDAR_ICAL_URL",
  "NEXT_PUBLIC_GOOGLE_CALENDAR_ICAL_URL",
  "GOOGLE_CALENDAR_NAME",
  "ADMIN_EMAILS",
  "NEXT_PUBLIC_ADMIN_EMAILS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function inspectValue(key: string) {
  const value = process.env[key]?.trim() || "";
  const result: Record<string, unknown> = {
    present: value.length > 0,
    length: value.length,
  };

  if (key.includes("CALENDAR") && key.includes("URL") && value) {
    try {
      const parsed = new URL(value);
      result.host = parsed.host;
      result.endsWithBasicIcs = parsed.pathname.endsWith("/basic.ics");
    } catch {
      result.invalidUrl = true;
    }
  }

  return result;
}

export async function GET() {
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    railwayCommit: process.env["RAILWAY_GIT_COMMIT_SHA"]?.slice(0, 8) || null,
    variables: Object.fromEntries(keys.map((key) => [key, inspectValue(key)])),
  });
}
