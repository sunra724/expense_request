"use client";

import { useEffect, useState } from "react";
import type { StampSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<StampSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then(setSettings);
  }, []);

  if (!settings) {
    return <div className="panel px-6 py-8">설정을 불러오는 중입니다.</div>;
  }

  async function save() {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSettings(await response.json());
  }

  return (
    <div className="space-y-6">
      <section className="panel px-6 py-6">
        <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Settings</div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">결재 및 기관 정보</h1>
        <p className="mt-2 text-sm text-slate-600">
          현재 기본 서명은 `협동조합 soilab (인)` 기준입니다. 결재자 명칭과 도장 경로를 여기서 맞춰주세요.
        </p>
      </section>

      <section className="panel grid gap-4 px-6 py-6 md:grid-cols-2">
        {[
          ["staff_name", "담당자명"],
          ["manager_name", "실장명"],
          ["chairperson_name", "이사장명"],
          ["org_name", "단체명"],
          ["staff_stamp", "담당자 도장 경로"],
          ["manager_stamp", "실장 도장 경로"],
          ["chairperson_stamp", "이사장 도장 경로"],
        ].map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="field mt-2"
              value={String(settings[key as keyof StampSettings] ?? "")}
              onChange={(event) =>
                setSettings({ ...settings, [key]: event.target.value } as StampSettings)
              }
            />
          </label>
        ))}
      </section>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={save}>
          설정 저장
        </button>
      </div>
    </div>
  );
}
