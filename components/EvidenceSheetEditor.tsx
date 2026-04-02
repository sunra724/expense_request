"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import PrintButton from "@/components/PrintButton";
import {
  countFilledEvidenceItems,
  createEvidenceAttachmentItem,
  evidenceDocumentTypeOptions,
  evidenceTypeLabel,
} from "@/lib/attachment-sheets";
import { formatCurrency } from "@/lib/format";
import type { EvidenceAttachmentSheet, Expenditure } from "@/lib/types";

export default function EvidenceSheetEditor({ expenditure }: { expenditure: Expenditure }) {
  const [sheet, setSheet] = useState<EvidenceAttachmentSheet>(expenditure.evidence_sheet);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalAmount = useMemo(
    () => sheet.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [sheet.items],
  );

  function updateItem(index: number, key: keyof EvidenceAttachmentSheet["items"][number], value: string | number) {
    setSheet((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [key]: key === "amount" ? Number(value) || 0 : value };
      return { ...current, items };
    });
  }

  function removeItem(index: number) {
    setSheet((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function saveSheet() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/expenditures/${expenditure.id}/attachments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_sheet: sheet }),
      });

      if (!response.ok) {
        setMessage("증빙서류 첨부철 저장에 실패했습니다.");
        return;
      }

      const updated = (await response.json()) as Expenditure;
      setSheet(updated.evidence_sheet);
      setMessage("증빙서류 첨부철을 저장했습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">Evidence Binder</div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl">증빙서류 첨부철</h1>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <div>연결 결의서: {expenditure.doc_number || `#${expenditure.id}`}</div>
              <div>사업명: {expenditure.project_name || "-"}</div>
              <div>지출 합계: {formatCurrency(expenditure.total_amount)}원</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-secondary" href={`/preview/${expenditure.id}`}>
              결의서 보기
            </Link>
            <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/photos`}>
              사진 첨부철
            </Link>
            <button className="btn btn-primary" onClick={saveSheet} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "저장 중..." : "저장"}
            </button>
            <PrintButton label="첨부철 인쇄" />
          </div>
        </div>
      </section>

      <section className="panel px-6 py-6">
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">첨부철 제목</span>
            <input
              className="field"
              value={sheet.title}
              onChange={(event) => setSheet((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm">
            <div className="text-slate-500">증빙 건수</div>
            <div className="mt-2 text-2xl font-semibold">{countFilledEvidenceItems(sheet)}건</div>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm">
            <div className="text-slate-500">증빙 금액 합계</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalAmount)}원</div>
          </div>
        </div>
        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-slate-700">제출 메모</span>
          <textarea
            className="textarea"
            value={sheet.submission_note}
            onChange={(event) => setSheet((current) => ({ ...current, submission_note: event.target.value }))}
            placeholder="예: 카드 전표 원본, 세금계산서 출력본, 현금영수증 확인서를 순서대로 첨부"
          />
        </label>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-lg font-semibold">증빙 목록</div>
            <div className="mt-1 text-sm text-slate-500">
              카드 전표, 세금계산서, 현금영수증, 영수증 등 실제 첨부 대상의 순서와 메모를 기록합니다.
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setSheet((current) => ({ ...current, items: [...current.items, createEvidenceAttachmentItem()] }))}
          >
            <Plus className="h-4 w-4" />
            증빙 추가
          </button>
        </div>
        <div className="overflow-x-auto px-6 py-6">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {["구분", "증빙명", "발급처", "증빙일자", "금액", "연결 항목", "파일/보관 메모", "비고", ""].map(
                  (label) => (
                    <th key={label} className="px-3 py-3 font-medium">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sheet.items.map((item, index) => (
                <tr key={item.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-3">
                    <select
                      className="select min-w-[132px]"
                      value={item.evidence_type}
                      onChange={(event) => updateItem(index, "evidence_type", event.target.value)}
                    >
                      {evidenceDocumentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="field min-w-[180px]"
                      value={item.title}
                      onChange={(event) => updateItem(index, "title", event.target.value)}
                      placeholder="예: 행사 다과 영수증"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="field min-w-[150px]"
                      value={item.issuer}
                      onChange={(event) => updateItem(index, "issuer", event.target.value)}
                      placeholder="발급처"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="field min-w-[130px]"
                      type="date"
                      value={item.issued_on}
                      onChange={(event) => updateItem(index, "issued_on", event.target.value)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="field min-w-[120px]"
                      type="number"
                      value={item.amount}
                      onChange={(event) => updateItem(index, "amount", event.target.value)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="field min-w-[160px]"
                      value={item.related_item}
                      onChange={(event) => updateItem(index, "related_item", event.target.value)}
                      placeholder="결의서 행 또는 항목"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      className="textarea min-w-[180px]"
                      value={item.file_note}
                      onChange={(event) => updateItem(index, "file_note", event.target.value)}
                      placeholder="원본/스캔본 보관 위치"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      className="textarea min-w-[160px]"
                      value={item.note}
                      onChange={(event) => updateItem(index, "note", event.target.value)}
                      placeholder="추가 메모"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button className="btn btn-danger !px-3 !py-2" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="print-sheet">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl font-bold tracking-[0.18em]">증빙서류 첨부철</div>
          <div className="text-sm text-slate-500">{sheet.title}</div>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
          <div>결의서 번호: {expenditure.doc_number || `#${expenditure.id}`}</div>
          <div>사업명: {expenditure.project_name || "-"}</div>
          <div>결의 금액: {formatCurrency(expenditure.total_amount)}원</div>
          <div>증빙 합계: {formatCurrency(totalAmount)}원</div>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="mb-2 font-semibold">제출 메모</div>
          <div className="whitespace-pre-wrap">{sheet.submission_note || "-"}</div>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {["연번", "구분", "증빙명", "발급처", "증빙일자", "금액", "연결 항목", "첨부 메모", "비고"].map((label) => (
                <th key={label} className="border border-slate-200 px-2 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-slate-200 px-2 py-2 text-center">{index + 1}</td>
                <td className="border border-slate-200 px-2 py-2">{evidenceTypeLabel(item.evidence_type)}</td>
                <td className="border border-slate-200 px-2 py-2">{item.title || "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{item.issuer || "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{item.issued_on || "-"}</td>
                <td className="border border-slate-200 px-2 py-2 text-right">{formatCurrency(item.amount)}</td>
                <td className="border border-slate-200 px-2 py-2">{item.related_item || "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{item.file_note || "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{item.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
