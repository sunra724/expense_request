import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import UpdatePasswordForm from "@/components/UpdatePasswordForm";
import { isAdminEmail } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=password_session");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3 text-teal-700">
          <span className="rounded-lg bg-teal-50 p-3">
            <KeyRound className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Password</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">비밀번호 변경</h1>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">앞으로 로그인에 사용할 비밀번호를 새로 설정합니다.</p>

        <UpdatePasswordForm />
      </section>
    </div>
  );
}
