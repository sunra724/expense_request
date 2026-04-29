"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const errorMessages: Record<string, string> = {
  auth_config: "인증 환경변수와 관리자 이메일 목록을 먼저 설정해야 합니다.",
  unauthorized: "관리자 권한이 있는 이메일만 접속할 수 있습니다.",
  password_session: "비밀번호 변경 링크가 만료되었거나 세션이 없습니다. 재설정 메일을 다시 요청해 주세요.",
  auth_callback: "인증 링크를 처리하지 못했습니다. 다시 시도해 주세요.",
};

export default function LoginForm({
  nextPath,
  initialError,
  disabled,
}: {
  nextPath: string;
  initialError?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialError ? errorMessages[initialError] || "로그인이 필요합니다." : "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<"login" | "reset" | null>(null);
  const supabase = useMemo(() => {
    if (disabled) return null;
    return createSupabaseBrowserClient();
  }, [disabled]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || disabled) return;

    setSubmitting("login");
    setError("");
    setMessage("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(null);

    if (signInError) {
      setError("이메일 또는 비밀번호를 확인해 주세요.");
      return;
    }

    router.refresh();
    window.location.assign(nextPath);
  }

  async function requestPasswordReset() {
    if (!email.trim()) {
      setError("비밀번호 재설정 메일을 받을 이메일을 입력해 주세요.");
      return;
    }

    setSubmitting("reset");
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    setSubmitting(null);

    if (!response.ok) {
      setError("재설정 메일 요청 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setMessage("관리자로 허용된 이메일이라면 비밀번호 설정/재설정 메일이 발송됩니다.");
  }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-5">
      <label className="block text-sm font-medium text-slate-700">
        이메일
        <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-100">
          <Mail className="h-4 w-4 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent py-1 outline-none"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={disabled || Boolean(submitting)}
            required
          />
        </span>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        비밀번호
        <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-100">
          <Lock className="h-4 w-4 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent py-1 outline-none"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={disabled || Boolean(submitting)}
            required
          />
        </span>
      </label>

      {message ? <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn btn-primary flex-1" type="submit" disabled={disabled || Boolean(submitting)}>
          {submitting === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          로그인
        </button>
        <button
          className="btn btn-secondary flex-1"
          type="button"
          onClick={requestPasswordReset}
          disabled={disabled || Boolean(submitting)}
        >
          {submitting === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          비밀번호 설정/재설정
        </button>
      </div>
    </form>
  );
}
