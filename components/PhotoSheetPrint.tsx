/* eslint-disable @next/next/no-img-element */
import { countFilledPhotoItems } from "@/lib/attachment-sheets";
import type { Expenditure, PhotoAttachmentSheet } from "@/lib/types";

const IMAGE_SLOT_COUNT = 2;

export default function PhotoSheetPrint({
  expenditure,
  sheet,
}: {
  expenditure: Expenditure;
  sheet: PhotoAttachmentSheet;
}) {
  return (
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
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: IMAGE_SLOT_COUNT }).map((_, imageIndex) => {
                const image = item.images[imageIndex];

                return (
                  <div
                    key={`${item.id}-print-image-${imageIndex}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    {image ? (
                      <img
                        src={image.data_url}
                        alt={item.title || `사진 ${index + 1}-${imageIndex + 1}`}
                        className="max-h-[320px] w-full object-contain"
                      />
                    ) : (
                      <div className="grid min-h-[220px] place-items-center border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                        사진 {imageIndex + 1} 없음
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2 text-sm">
              <div>제목: {item.title || "-"}</div>
              <div>촬영일: {item.shot_date || "-"}</div>
              <div>위치: {item.location || "-"}</div>
              <div>연결 항목: {item.related_item || "-"}</div>
              <div>설명: {item.description || "-"}</div>
              <div>파일명: {item.images.map((image) => image.name).filter(Boolean).join(", ") || "-"}</div>
              <div>파일/보관 메모: {item.file_note || "-"}</div>
              <div>비고: {item.note || "-"}</div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
