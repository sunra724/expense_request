import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import LoginForm from "@/components/LoginForm";
import { getMissingAuthConfigKeys, isAdminEmail, sanitizeRedirectPath } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeRedirectPath(params.next);
  const missingConfigKeys = getMissingAuthConfigKeys();
  const authConfigured = missingConfigKeys.length === 0;

  if (authConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && isAdminEmail(user.email)) {
      redirect(nextPath);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3 text-teal-700">
          <span className="rounded-lg bg-teal-50 p-3">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Admin Login</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">청년 다다름 사업 관리 시스템</h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600">
          소이랩 공용 이메일과 관리자 이메일로 등록된 계정만 접속할 수 있습니다.
        </p>

        {!authConfigured ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Railway 실행 환경에서 아래 변수가 읽히지 않습니다.
            <div className="mt-2 font-mono text-xs">{missingConfigKeys.join(", ")}</div>
          </div>
        ) : null}

        <LoginForm nextPath={nextPath} initialError={params.error} disabled={!authConfigured} />
      </section>
    </div>
  );
}
