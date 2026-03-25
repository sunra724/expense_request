"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";
import type { Proposal, ProposalInput, ProposalItem } from "@/lib/types";
import { formatCurrency, today } from "@/lib/format";

const emptyItem = (): ProposalItem => ({
  expense_category: "",
  description: "",
  estimated_amount: 0,
  calculation_basis: "",
  note: "",
});

const blankProposal = (): ProposalInput => ({
  doc_number: "",
  fund_type: "grant",
  project_name: "",
  project_period: "",
  total_amount: 0,
  related_plan: "",
  org_name: "협동조합 소이랩",
  submission_date: today(),
  items: [emptyItem()],
  status: "draft",
});

export default function ProposalManager() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [form, setForm] = useState<ProposalInput>(blankProposal());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  async function fetchList() {
    const response = await fetch("/api/proposals");
    setItems(await response.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/proposals")
      .then((response) => response.json())
      .then((data: Proposal[]) => {
        if (active) setItems(data);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalAmount = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.estimated_amount || 0), 0),
    [form.items],
  );

  async function openForEdit(id: number) {
    const response = await fetch(`/api/proposals/${id}`);
    const data = await response.json();
    setEditingId(id);
    setForm(data);
    setOpen(true);
  }

  async function save(status: Proposal["status"]) {
    const payload: ProposalInput = { ...form, total_amount: totalAmount, status };
    await fetch(editingId ? `/api/proposals/${editingId}` : "/api/proposals", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setEditingId(null);
    setForm(blankProposal());
    fetchList();
  }

  async function remove(id: number) {
    await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    fetchList();
    setSelected((current) => current.filter((item) => item !== id));
  }

  const batchHref = `/proposals/batch-preview?ids=${selected.join(",")}`;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-6 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Proposal Workspace</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">지출품의서 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            사전 품의 문서를 작성하고, A4 인쇄 레이아웃으로 바로 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            새 품의서
          </button>
          {selected.length > 0 ? (
            <Link className="btn btn-secondary" href={batchHref} target="_blank">
              <Printer className="h-4 w-4" />
              선택 {selected.length}건 인쇄
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "전체", value: items.length },
          { label: "작성중", value: items.filter((item) => item.status === "draft").length },
          { label: "완료", value: items.filter((item) => item.status === "finalized").length },
        ].map((card) => (
          <div key={card.label} className="panel px-5 py-5">
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">선택</th>
                <th className="px-4 py-3">사업명</th>
                <th className="px-4 py-3">재원구분</th>
                <th className="px-4 py-3">사업기간</th>
                <th className="px-4 py-3 text-right">금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(item.id)
                            ? current.filter((value) => value !== item.id)
                            : [...current, item.id],
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{item.project_name}</td>
                  <td className="px-4 py-3">{item.fund_type}</td>
                  <td className="px-4 py-3">{item.project_period || "-"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.total_amount)}원</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${item.status === "finalized" ? "badge-finalized" : "badge-draft"}`}>
                      {item.status === "finalized" ? "완료" : "작성중"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link className="btn btn-secondary !px-3 !py-2" href={`/proposals/preview/${item.id}`} target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button className="btn btn-secondary !px-3 !py-2" onClick={() => openForEdit(item.id)}>
                        수정
                      </button>
                      <button className="btn btn-danger !px-3 !py-2" onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4">
          <div className="panel max-h-[92vh] w-full max-w-5xl overflow-y-auto px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">지출품의서</div>
                <h2 className="text-2xl font-semibold">{editingId ? "품의서 수정" : "새 품의서 작성"}</h2>
              </div>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm">
                재원구분
                <select
                  className="select mt-2"
                  value={form.fund_type}
                  onChange={(event) => setForm({ ...form, fund_type: event.target.value as Proposal["fund_type"] })}
                >
                  <option value="grant">보조금</option>
                  <option value="self">자부담</option>
                  <option value="both">혼합</option>
                </select>
              </label>
              <label className="block text-sm md:col-span-2">
                단위사업명
                <input
                  className="field mt-2"
                  value={form.project_name}
                  onChange={(event) => setForm({ ...form, project_name: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                사업기간
                <input
                  className="field mt-2"
                  value={form.project_period}
                  onChange={(event) => setForm({ ...form, project_period: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                문서번호
                <input
                  className="field mt-2"
                  value={form.doc_number}
                  onChange={(event) => setForm({ ...form, doc_number: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                작성일
                <input
                  className="field mt-2"
                  type="date"
                  value={form.submission_date}
                  onChange={(event) => setForm({ ...form, submission_date: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">비목</th>
                    <th className="px-3 py-3">적요</th>
                    <th className="px-3 py-3">추정금액</th>
                    <th className="px-3 py-3">산출근거</th>
                    <th className="px-3 py-3">비고</th>
                    <th className="px-3 py-3">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.expense_category}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], expense_category: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.description}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], description: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          type="number"
                          value={item.estimated_amount}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], estimated_amount: Number(event.target.value) };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.calculation_basis}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], calculation_basis: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="field"
                          value={item.note}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], note: event.target.value };
                            setForm({ ...form, items: next });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          className="btn btn-danger !px-3 !py-2"
                          onClick={() =>
                            setForm({
                              ...form,
                              items: form.items.length === 1 ? [emptyItem()] : form.items.filter((_, i) => i !== index),
                            })
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button className="btn btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>
                행 추가
              </button>
              <div className="text-sm font-semibold text-slate-700">합계 {formatCurrency(totalAmount)}원</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                관련계획서
                <textarea
                  className="textarea mt-2"
                  value={form.related_plan}
                  onChange={(event) => setForm({ ...form, related_plan: event.target.value })}
                />
              </label>
              <label className="block text-sm">
                단체명
                <input
                  className="field mt-2"
                  value={form.org_name}
                  onChange={(event) => setForm({ ...form, org_name: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => save("draft")}>
                임시저장
              </button>
              <button className="btn btn-primary" onClick={() => save("finalized")}>
                저장 완료
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
