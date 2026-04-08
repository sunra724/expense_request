/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { FileUp, Plus, Save, Trash2, X } from "lucide-react";
import PrintButton from "@/components/PrintButton";
import {
  countFilledEvidenceItems,
  createEvidenceAttachmentItem,
  evidenceDocumentTypeOptions,
} from "@/lib/attachment-sheets";
import { convertImageFileToDataUrl, readFileAsDataUrl } from "@/lib/browser-image";
import { formatCurrency } from "@/lib/format";
import type { EvidenceAttachmentSheet, Expenditure } from "@/lib/types";

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

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

  async function uploadAttachment(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    try {
      const dataUrl = isImageMimeType(file.type)
        ? await convertImageFileToDataUrl(file)
        : await readFileAsDataUrl(file);

      setSheet((current) => {
        const items = [...current.items];
        const currentItem = items[index];
        items[index] = {
          ...currentItem,
          attachment_name: file.name,
          attachment_data_url: dataUrl,
          attachment_mime_type: file.type || "application/octet-stream",
          file_note: currentItem.file_note || file.name,
        };
        return { ...current, items };
      });

      setMessage("증빙 파일을 첨부지에 반영했습니다. 저장을 누르면 실제로 보관됩니다.");
    } catch {
      setMessage("증빙 파일을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
  }

  function clearAttachment(index: number) {
    setSheet((current) => {
      const items = [...current.items];
      items[index] = {
        ...items[index],
        attachment_name: "",
        attachment_data_url: "",
        attachment_mime_type: "",
      };
      return { ...current, items };
    });
  }

  function removeItem(index: number) {
    setSheet((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
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
        setMessage("증빙서류 첨부지 저장에 실패했습니다.");
        return;
      }

      const updated = (await response.json()) as Expenditure;
      setSheet(updated.evidence_sheet);
      setMessage("증빙서류 첨부지를 저장했습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">
              Evidence Binder
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl">증빙서류 첨부지</h1>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <div>연결 결의서: {expenditure.doc_number || `#${expenditure.id}`}</div>
              <div>사업명: {expenditure.project_name || "-"}</div>
              <div>PDF와 이미지 파일을 직접 첨부할 수 있습니다.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-secondary" href={`/preview/${expenditure.id}`}>
              결의서 보기
            </Link>
            <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/photos`}>
              사진 첨부지
            </Link>
            <button className="btn btn-primary" onClick={saveSheet} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "저장 중..." : "저장"}
            </button>
            <PrintButton label="첨부지 인쇄" />
          </div>
        </div>
      </section>

      <section className="panel px-6 py-6">
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">첨부지 제목</span>
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
            onChange={(event) =>
              setSheet((current) => ({ ...current, submission_note: event.target.value }))
            }
            placeholder="예: 이체확인증, 세금계산서, 거래명세서를 순서대로 첨부"
          />
        </label>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-lg font-semibold">증빙 목록</div>
            <div className="mt-1 text-sm text-slate-500">
              한 증빙 항목마다 PDF 또는 이미지 파일 1개를 실제로 붙일 수 있습니다.
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() =>
              setSheet((current) => ({ ...current, items: [...current.items, createEvidenceAttachmentItem()] }))
            }
          >
            <Plus className="h-4 w-4" />
            증빙 추가
          </button>
        </div>
        <div className="grid gap-4 px-6 py-6">
          {sheet.items.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">증빙 {index + 1}</div>
                <button className="btn btn-danger !px-3 !py-2" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="btn btn-secondary cursor-pointer !px-3 !py-2">
                    <FileUp className="h-4 w-4" />
                    파일 선택
                    <input
                      className="hidden"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(event) => {
                        uploadAttachment(index, event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {item.attachment_data_url ? (
                    <button
                      className="btn btn-danger !px-3 !py-2"
                      onClick={() => clearAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                      첨부 제거
                    </button>
                  ) : null}
                  <div className="text-xs text-slate-500">PDF 또는 JPG/PNG 파일을 올릴 수 있습니다.</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {item.attachment_data_url ? (
                    isImageMimeType(item.attachment_mime_type) ? (
                      <div className="space-y-3">
                        <img
                          src={item.attachment_data_url}
                          alt={item.title || `증빙 ${index + 1}`}
                          className="max-h-[420px] w-full rounded-2xl object-contain"
                        />
                        <div className="text-xs text-slate-500">
                          {item.attachment_name || "업로드된 이미지"}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
                        <div className="font-medium">PDF 첨부 완료</div>
                        <div className="mt-2 break-all text-xs text-slate-500">
                          {item.attachment_name || "첨부된 PDF"}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                      업로드한 증빙 파일이 여기에 표시됩니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">구분</span>
                  <select
                    className="select"
                    value={item.evidence_type}
                    onChange={(event) => updateItem(index, "evidence_type", event.target.value)}
                  >
                    {evidenceDocumentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">증빙명</span>
                  <input
                    className="field"
                    value={item.title}
                    onChange={(event) => updateItem(index, "title", event.target.value)}
                    placeholder="예: 이체확인증"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">발급처</span>
                  <input
                    className="field"
                    value={item.issuer}
                    onChange={(event) => updateItem(index, "issuer", event.target.value)}
                    placeholder="예: 국민은행"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">증빙일자</span>
                  <input
                    className="field"
                    type="date"
                    value={item.issued_on}
                    onChange={(event) => updateItem(index, "issued_on", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">금액</span>
                  <input
                    className="field"
                    type="number"
                    value={item.amount}
                    onChange={(event) => updateItem(index, "amount", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">연결 항목</span>
                  <input
                    className="field"
                    value={item.related_item}
                    onChange={(event) => updateItem(index, "related_item", event.target.value)}
                    placeholder="예: 운영담당자 3월 인건비"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">파일/보관 메모</span>
                  <textarea
                    className="textarea"
                    value={item.file_note}
                    onChange={(event) => updateItem(index, "file_note", event.target.value)}
                    placeholder="예: 출력 후 스캔본 PDF, 드라이브 경로, 원본 보관 위치"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">비고</span>
                  <textarea
                    className="textarea"
                    value={item.note}
                    onChange={(event) => updateItem(index, "note", event.target.value)}
                    placeholder="추가 메모"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}
