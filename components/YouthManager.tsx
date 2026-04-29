"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { Organization, Project, ProjectYouth, ProjectYouthInput } from "@/lib/types";

type ContextPayload = {
  organizations: Organization[];
  projects: Project[];
};

function emptyYouth(projectId: number, serialNo: number): ProjectYouthInput {
  return {
    project_id: projectId,
    serial_no: serialNo,
    display_name: "",
    enrolled_on: "",
    withdrawn_on: "",
    withdrawal_reason: "",
    status: "active",
    notes: "",
  };
}

export default function YouthManager() {
  const [context, setContext] = useState<ContextPayload>({ organizations: [], projects: [] });
  const [projectId, setProjectId] = useState<number | null>(null);
  const [youths, setYouths] = useState<ProjectYouth[]>([]);
  const [form, setForm] = useState<ProjectYouthInput>(emptyYouth(0, 1));
  const [editingId, setEditingId] = useState<number | null>(null);

  const selectedProject = useMemo(
    () => context.projects.find((project) => project.id === projectId) ?? null,
    [context.projects, projectId],
  );
  const nextSerialNo = useMemo(() => {
    const used = new Set(youths.map((youth) => youth.serial_no));
    for (let index = 1; index <= 20; index += 1) {
      if (!used.has(index)) return index;
    }
    return youths.length + 1;
  }, [youths]);

  async function fetchYouths(nextProjectId: number) {
    const response = await fetch(`/api/projects/${nextProjectId}/youths`);
    setYouths(await response.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/context")
      .then((response) => response.json())
      .then((data: ContextPayload) => {
        if (!active) return;
        setContext(data);
        const firstProject =
          data.projects.find((project) => project.guideline_code === "youth-dadareum-2026") ??
          data.projects[0] ??
          null;
        setProjectId(firstProject?.id ?? null);
        setForm(emptyYouth(firstProject?.id ?? 0, 1));
        if (firstProject) fetchYouths(firstProject.id);
      });

    return () => {
      active = false;
    };
  }, []);

  function resetForm(nextProjectId = projectId ?? 0, serialNo = nextSerialNo) {
    setEditingId(null);
    setForm(emptyYouth(nextProjectId, serialNo));
  }

  async function saveYouth() {
    if (!projectId || !form.display_name.trim()) {
      window.alert("사업과 청년 이름을 입력해주세요.");
      return;
    }

    const payload = {
      ...form,
      project_id: projectId,
      serial_no: Number(form.serial_no || nextSerialNo),
      display_name: form.display_name.trim(),
    };
    await fetch(editingId ? `/api/youths/${editingId}` : `/api/projects/${projectId}/youths`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await fetchYouths(projectId);
    resetForm(projectId);
  }

  async function deleteYouth(id: number) {
    await fetch(`/api/youths/${id}`, { method: "DELETE" });
    if (projectId) await fetchYouths(projectId);
    if (editingId === id) resetForm();
  }

  function editYouth(youth: ProjectYouth) {
    setEditingId(youth.id);
    setForm({
      project_id: youth.project_id,
      serial_no: youth.serial_no,
      display_name: youth.display_name,
      enrolled_on: youth.enrolled_on,
      withdrawn_on: youth.withdrawn_on,
      withdrawal_reason: youth.withdrawal_reason,
      status: youth.status,
      notes: youth.notes,
    });
  }

  function changeProject(nextProjectId: number) {
    setProjectId(nextProjectId);
    setYouths([]);
    resetForm(nextProjectId, 1);
    if (nextProjectId) fetchYouths(nextProjectId);
  }

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Youth Ledger</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">참여청년 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            청년별 240만원 한도와 결의서 안분 집계를 위해 사업별 참여청년 명단을 관리합니다.
          </p>
        </div>

        <label className="block min-w-72 text-sm">
          사업
          <select
            className="select mt-2"
            value={projectId ?? ""}
            onChange={(event) => changeProject(Number(event.target.value))}
          >
            <option value="">사업 선택</option>
            {context.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">등록 청년</div>
          <div className="mt-3 text-3xl font-semibold">{youths.length}</div>
        </div>
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">활동중</div>
          <div className="mt-3 text-3xl font-semibold">
            {youths.filter((youth) => youth.status === "active").length}
          </div>
        </div>
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">중도이탈</div>
          <div className="mt-3 text-3xl font-semibold">
            {youths.filter((youth) => youth.status === "withdrawn").length}
          </div>
        </div>
        <div className="panel px-5 py-5">
          <div className="text-sm text-slate-500">사업</div>
          <div className="mt-3 truncate text-xl font-semibold">{selectedProject?.name ?? "-"}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? "청년 정보 수정" : "청년 등록"}</h2>
            <button className="btn btn-secondary !px-3 !py-2" onClick={() => resetForm()}>
              <Plus className="h-4 w-4" />
              신규
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              연번
              <input
                className="field mt-2"
                type="number"
                value={form.serial_no}
                onChange={(event) => setForm({ ...form, serial_no: Number(event.target.value) })}
              />
            </label>
            <label className="block text-sm">
              상태
              <select
                className="select mt-2"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as ProjectYouthInput["status"] })
                }
              >
                <option value="active">활동중</option>
                <option value="withdrawn">중도이탈</option>
                <option value="completed">완료</option>
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              이름
              <input
                className="field mt-2"
                value={form.display_name}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
              />
            </label>
            <label className="block text-sm">
              참여 시작일
              <input
                className="field mt-2"
                type="date"
                value={form.enrolled_on}
                onChange={(event) => setForm({ ...form, enrolled_on: event.target.value })}
              />
            </label>
            <label className="block text-sm">
              이탈일
              <input
                className="field mt-2"
                type="date"
                value={form.withdrawn_on}
                onChange={(event) => setForm({ ...form, withdrawn_on: event.target.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              이탈 사유
              <input
                className="field mt-2"
                value={form.withdrawal_reason}
                onChange={(event) => setForm({ ...form, withdrawal_reason: event.target.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              메모
              <textarea
                className="textarea mt-2"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" onClick={saveYouth}>
              <Save className="h-4 w-4" />
              저장
            </button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">연번</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">참여기간</th>
                  <th className="px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {youths.length ? (
                  youths.map((youth) => (
                    <tr key={youth.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{youth.serial_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{youth.display_name}</div>
                        {youth.notes ? <div className="mt-1 text-xs text-slate-500">{youth.notes}</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${youth.status === "active" ? "badge-finalized" : "badge-draft"}`}>
                          {youth.status === "active" ? "활동중" : youth.status === "withdrawn" ? "중도이탈" : "완료"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {youth.enrolled_on || "-"}
                        {youth.withdrawn_on ? ` ~ ${youth.withdrawn_on}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-secondary !px-3 !py-2" onClick={() => editYouth(youth)}>
                            수정
                          </button>
                          <button className="btn btn-danger !px-3 !py-2" onClick={() => deleteYouth(youth.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                      등록된 참여청년이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
