/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import PrintButton from "@/components/PrintButton";
import { countFilledPhotoItems, createPhotoAttachmentItem } from "@/lib/attachment-sheets";
import { convertImageFileToDataUrl } from "@/lib/browser-image";
import type { Expenditure, PhotoAttachmentSheet } from "@/lib/types";

export default function PhotoSheetEditor({ expenditure }: { expenditure: Expenditure }) {
  const [sheet, setSheet] = useState<PhotoAttachmentSheet>(expenditure.photo_sheet);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateItem(index: number, key: keyof PhotoAttachmentSheet["items"][number], value: string) {
    setSheet((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [key]: value };
      return { ...current, items };
    });
  }

  async function uploadImage(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await convertImageFileToDataUrl(file);
      setSheet((current) => {
        const items = [...current.items];
        const currentItem = items[index];
        items[index] = {
          ...currentItem,
          image_name: file.name,
          image_data_url: imageDataUrl,
          file_note: currentItem.file_note || file.name,
        };
        return { ...current, items };
      });
      setMessage("사진을 첨부지에 반영했습니다. 저장을 누르면 실제로 보관됩니다.");
    } catch {
      setMessage("사진 파일을 불러오지 못했습니다. 다른 이미지로 다시 시도해 주세요.");
    }
  }

  function clearImage(index: number) {
    setSheet((current) => {
      const items = [...current.items];
      items[index] = {
        ...items[index],
        image_name: "",
        image_data_url: "",
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
        body: JSON.stringify({ photo_sheet: sheet }),
      });

      if (!response.ok) {
        setMessage("증빙사진 첨부지 저장에 실패했습니다.");
        return;
      }

      const updated = (await response.json()) as Expenditure;
      setSheet(updated.photo_sheet);
      setMessage("증빙사진 첨부지를 저장했습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-sm uppercase tracking-[0.24em] text-slate-500">
              Photo Binder
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl">증빙사진 첨부지</h1>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <div>연결 결의서: {expenditure.doc_number || `#${expenditure.id}`}</div>
              <div>사업명: {expenditure.project_name || "-"}</div>
              <div>사진 파일을 직접 올리면 첨부지와 PDF에 실제 이미지가 표시됩니다.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-secondary" href={`/preview/${expenditure.id}`}>
              결의서 보기
            </Link>
            <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/evidence`}>
              증빙서류 첨부지
            </Link>
            <button className="btn btn-primary" onClick={saveSheet} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "저장 중..." : "저장"}
            </button>
            <PrintButton label="사진대지 인쇄" />
          </div>
        </div>
      </section>

      <section className="panel px-6 py-6">
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">첨부지 제목</span>
            <input
              className="field"
              value={sheet.title}
              onChange={(event) =>
                setSheet((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
          <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm">
            <div className="text-slate-500">사진 기록 건수</div>
            <div className="mt-2 text-2xl font-semibold">{countFilledPhotoItems(sheet)}건</div>
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
            placeholder="예: 행사 전경, 프로그램 진행, 결과물 설치 사진을 순서대로 첨부"
          />
        </label>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-lg font-semibold">사진 기록</div>
            <div className="mt-1 text-sm text-slate-500">
              각 기록마다 사진 한 장을 직접 올리고, 제목과 설명을 함께 저장할 수 있습니다.
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() =>
              setSheet((current) => ({
                ...current,
                items: [...current.items, createPhotoAttachmentItem()],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            사진 기록 추가
          </button>
        </div>
        <div className="grid gap-4 px-6 py-6">
          {sheet.items.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">사진 {index + 1}</div>
                <button className="btn btn-danger !px-3 !py-2" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="btn btn-secondary cursor-pointer !px-3 !py-2">
                    <ImagePlus className="h-4 w-4" />
                    사진 파일 선택
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        uploadImage(index, event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {item.image_data_url ? (
                    <button
                      className="btn btn-danger !px-3 !py-2"
                      onClick={() => clearImage(index)}
                    >
                      <X className="h-4 w-4" />
                      사진 제거
                    </button>
                  ) : null}
                  <div className="text-xs text-slate-500">
                    업로드한 사진은 출력용으로 자동 최적화됩니다.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {item.image_data_url ? (
                    <div className="space-y-3">
                      <img
                        src={item.image_data_url}
                        alt={item.title || `사진 ${index + 1}`}
                        className="max-h-[420px] w-full rounded-2xl object-contain"
                      />
                      <div className="text-xs text-slate-500">{item.image_name || "업로드된 사진"}</div>
                    </div>
                  ) : (
                    <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
                      업로드한 사진이 여기에 표시됩니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">사진 제목</span>
                  <input
                    className="field"
                    value={item.title}
                    onChange={(event) => updateItem(index, "title", event.target.value)}
                    placeholder="예: 기념품 제공사진"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">촬영일</span>
                  <input
                    className="field"
                    type="date"
                    value={item.shot_date}
                    onChange={(event) => updateItem(index, "shot_date", event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">촬영 위치</span>
                  <input
                    className="field"
                    value={item.location}
                    onChange={(event) => updateItem(index, "location", event.target.value)}
                    placeholder="예: 다다름사업 OT"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">연결 항목</span>
                  <input
                    className="field"
                    value={item.related_item}
                    onChange={(event) => updateItem(index, "related_item", event.target.value)}
                    placeholder="예: 행사 운영, 결과물 설치"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">사진 설명</span>
                  <textarea
                    className="textarea"
                    value={item.description}
                    onChange={(event) => updateItem(index, "description", event.target.value)}
                    placeholder="사진에 무엇이 담겼는지 설명"
                  />
                </label>
                <div className="grid gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">파일/보관 메모</span>
                    <textarea
                      className="textarea"
                      value={item.file_note}
                      onChange={(event) => updateItem(index, "file_note", event.target.value)}
                      placeholder="사진 파일명, 보관 위치, 드라이브 링크 등"
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
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="print-sheet">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl font-bold tracking-[0.18em]">증빙사진 첨부지</div>
          <div className="text-sm text-slate-500">{sheet.title}</div>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
          <div>결의서 번호: {expenditure.doc_number || `#${expenditure.id}`}</div>
          <div>사업명: {expenditure.project_name || "-"}</div>
          <div>사진 기록 건수: {countFilledPhotoItems(sheet)}건</div>
          <div>촬영 자료: 결의서 증빙 사진</div>
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="mb-2 font-semibold">제출 메모</div>
          <div className="whitespace-pre-wrap">{sheet.submission_note || "-"}</div>
        </section>

        <div className="grid gap-4">
          {sheet.items.map((item, index) => (
            <section key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-sm font-semibold">사진 {index + 1}</div>
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {item.image_data_url ? (
                  <img
                    src={item.image_data_url}
                    alt={item.title || `사진 ${index + 1}`}
                    className="max-h-[360px] w-full object-contain"
                  />
                ) : (
                  <div className="grid min-h-[180px] place-items-center border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                    {item.file_note || "사진 파일 또는 출력물을 여기에 배치"}
                  </div>
                )}
              </div>
              <div className="grid gap-2 text-sm">
                <div>제목: {item.title || "-"}</div>
                <div>촬영일: {item.shot_date || "-"}</div>
                <div>위치: {item.location || "-"}</div>
                <div>연결 항목: {item.related_item || "-"}</div>
                <div>설명: {item.description || "-"}</div>
                <div>파일명: {item.image_name || "-"}</div>
                <div>파일/보관 메모: {item.file_note || "-"}</div>
                <div>비고: {item.note || "-"}</div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
