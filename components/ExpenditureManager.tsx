"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";
import {
  countFilledEvidenceItems,
  countFilledPhotoItems,
  createEvidenceAttachmentSheet,
  createPhotoAttachmentSheet,
} from "@/lib/attachment-sheets";
import type { Expenditure, ExpenditureInput, ExpenditureItem, Proposal } from "@/lib/types";
import { formatCurrency, today } from "@/lib/format";

const emptyItem = (): ExpenditureItem => ({ description: "", amount: 0, note: "" });

const blankForm = (): ExpenditureInput => ({
  proposal_id: null,
  doc_number: "",
  project_name: "",
  expense_category: "",
  issue_date: today(),
  record_date: today(),
  total_amount: 0,
  payee_address: "",
  payee_company: "",
  payee_name: "",
  payment_method: "계좌이체",
  receipt_date: today(),
  receipt_name: "",
  items: [emptyItem()],
  evidence_sheet: createEvidenceAttachmentSheet(),
  photo_sheet: createPhotoAttachmentSheet(),
  status: "draft",
});

export default function ExpenditureManager({
  initialFromProposalId = null,
}: {
  initialFromProposalId?: string | null;
}) {
  const [items, setItems] = useState<Expenditure[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [form, setForm] = useState<ExpenditureInput>(blankForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [linkedProposalName, setLinkedProposalName] = useState("");
  const [prefilledFromProposalId, setPrefilledFromProposalId] = useState<number | null>(null);

  async function fetchList() {
    const response = await fetch("/api/expenditures");
    setItems(await response.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/expenditures")
      .then((response) => response.json())
      .then((data: Expenditure[]) => {
        if (active) setItems(data);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fromProposalId = initialFromProposalId;
    if (!fromProposalId || editingId) return;
    if (prefilledFromProposalId === Number(fromProposalId)) return;

    let active = true;
    fetch(`/api/proposals/${fromProposalId}`)
      .then((response) => response.json())
      .then((proposal: Proposal) => {
        if (!active || !proposal?.id) return;
        const drafted: ExpenditureInput = {
          proposal_id: proposal.id,
          doc_number: "",
          project_name: proposal.project_name,
          expense_category: proposal.items[0]?.expense_category ?? "",
          issue_date: today(),
          record_date: today(),
          total_amount: proposal.total_amount,
          payee_address: "",
          payee_company: "",
          payee_name: "",
          payment_method: "계좌이체",
          receipt_date: today(),
          receipt_name: "",
          items: proposal.items.length
            ? proposal.items.map((item) => ({
                description: item.description,
                amount: item.estimated_amount,
                note: item.note,
              }))
            : [emptyItem()],
          evidence_sheet: createEvidenceAttachmentSheet(proposal.project_name),
          photo_sheet: createPhotoAttachmentSheet(proposal.project_name),
          status: "draft",
        };
        setForm(drafted);
        setLinkedProposalName(proposal.project_name);
        setPrefilledFromProposalId(proposal.id);
        setEditingId(null);
        setOpen(true);
      });

    return () => {
      active = false;
    };
  }, [editingId, initialFromProposalId, prefilledFromProposalId]);

  const totalAmount = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [form.items],
  );

  async function openForEdit(id: number) {
    const response = await fetch(`/api/expenditures/${id}`);
    const data = await response.json();
    setEditingId(id);
    setForm(data);
    setLinkedProposalName(data.proposal_id ? data.project_name : "");
    setOpen(true);
  }

  async function save(status: Expenditure["status"]) {
    const payload: ExpenditureInput = { ...form, total_amount: totalAmount, status };
    await fetch(editingId ? `/api/expenditures/${editingId}` : "/api/expenditures", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    setEditingId(null);
    setForm(blankForm());
    setLinkedProposalName("");
    fetchList();
  }

  async function remove(id: number) {
    await fetch(`/api/expenditures/${id}`, { method: "DELETE" });
    fetchList();
    setSelected((current) => current.filter((item) => item !== id));
  }

  const batchHref = `/batch-preview?ids=${selected.join(",")}`;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-6 px-6 py-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Resolution Workspace</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">지출결의서 관리</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            품의서 승인 후 실제 집행 내역을 정리하는 후속 문서입니다. Supabase 키를 넣으면 실제 운영 DB와 연결됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            새 결의서
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
                <th className="px-4 py-3">연계 품의서</th>
                <th className="px-4 py-3">비목</th>
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
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.project_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      증빙 {countFilledEvidenceItems(item.evidence_sheet)}건 · 사진 {countFilledPhotoItems(item.photo_sheet)}건
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.proposal_id ? (
                      <Link className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline" href={`/proposals/preview/${item.proposal_id}`} target="_blank">
                        품의서 #{item.proposal_id}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">{item.expense_category || "-"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.total_amount)}원</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${item.status === "finalized" ? "badge-finalized" : "badge-draft"}`}>
                      {item.status === "finalized" ? "완료" : "작성중"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link className="btn btn-secondary !px-3 !py-2" href={`/preview/${item.id}`} target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link className="btn btn-secondary !px-3 !py-2" href={`/expenditures/${item.id}/evidence`}>
                        증빙
                      </Link>
                      <Link className="btn btn-secondary !px-3 !py-2" href={`/expenditures/${item.id}/photos`}>
                        사진
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
                <div className="text-sm text-slate-500">지출결의서</div>
                <h2 className="text-2xl font-semibold">{editingId ? "결의서 수정" : "새 결의서 작성"}</h2>
                {form.proposal_id ? (
                  <p className="mt-2 text-sm text-teal-700">
                    연결된 지출품의서 #{form.proposal_id}
                    {linkedProposalName ? ` · ${linkedProposalName}` : ""}
                  </p>
                ) : null}
              </div>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm">
                연계 품의서 ID
                <input
                  className="field mt-2"
                  type="number"
                  value={form.proposal_id ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      proposal_id: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
              {[
                { key: "project_name", label: "단위사업명" },
                { key: "doc_number", label: "문서번호" },
                { key: "expense_category", label: "비목" },
                { key: "issue_date", label: "발의일", type: "date" },
                { key: "record_date", label: "회계기록일", type: "date" },
                { key: "payment_method", label: "지급방법" },
                { key: "payee_company", label: "거래처" },
                { key: "payee_name", label: "수취인" },
                { key: "receipt_name", label: "영수증명" },
              ].map((field) => (
                <label key={field.key} className="block text-sm">
                  {field.label}
                  <input
                    className="field mt-2"
                    type={"type" in field ? field.type : "text"}
                    value={form[field.key as keyof ExpenditureInput] as string}
                    onChange={(event) =>
                      setForm({ ...form, [field.key]: event.target.value } as ExpenditureInput)
                    }
                  />
                </label>
              ))}
              <label className="block text-sm md:col-span-3">
                주소
                <input
                  className="field mt-2"
                  value={form.payee_address}
                  onChange={(event) => setForm({ ...form, payee_address: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">적요</th>
                    <th className="px-3 py-3">금액</th>
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
                          value={item.amount}
                          onChange={(event) => {
                            const next = [...form.items];
                            next[index] = { ...next[index], amount: Number(event.target.value) };
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
