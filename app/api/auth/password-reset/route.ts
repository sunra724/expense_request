import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAppUrl, hasSupabaseAuthEnv, isAdminEmail } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !isAdminEmail(email)) {
    return NextResponse.json({ ok: true });
  }

  if (!hasSupabaseAuthEnv()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/auth/update-password`,
  });

  return NextResponse.json({ ok: true });
}
