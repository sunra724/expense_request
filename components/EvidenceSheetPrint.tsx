/* eslint-disable @next/next/no-img-element */
import { countFilledEvidenceItems, evidenceTypeLabel } from "@/lib/attachment-sheets";
import { formatCurrency } from "@/lib/format";
import type { EvidenceAttachmentSheet, Expenditure } from "@/lib/types";

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isPdfMimeType(mimeType: string) {
  return mimeType === "application/pdf";
}

export default function EvidenceSheetPrint({
  expenditure,
  sheet,
}: {
  expenditure: Expenditure;
  sheet: EvidenceAttachmentSheet;
}) {
  const totalAmount = sheet.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="print-sheet">
      <div className="mb-6 text-center">
        <div className="mb-2 text-3xl font-bold tracking-[0.18em]">증빙서류 첨부지</div>
        <div className="text-sm text-slate-500">{sheet.title}</div>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
        <div>결의서 번호: {expenditure.doc_number || `#${expenditure.id}`}</div>
        <div>사업명: {expenditure.project_name || "-"}</div>
        <div>결의 금액: {formatCurrency(expenditure.total_amount)}원</div>
        <div>증빙 합계: {formatCurrency(totalAmount)}원</div>
        <div>증빙 건수: {countFilledEvidenceItems(sheet)}건</div>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 p-4 text-sm">
        <div className="mb-2 font-semibold">제출 메모</div>
        <div className="whitespace-pre-wrap">{sheet.submission_note || "-"}</div>
      </section>

      <div className="grid gap-4">
        {sheet.items.map((item, index) => (
          <section key={item.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold">증빙 {index + 1}</div>
            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {item.attachment_data_url ? (
                isImageMimeType(item.attachment_mime_type) ? (
                  <img
                    src={item.attachment_data_url}
                    alt={item.title || `증빙 ${index + 1}`}
                    className="max-h-[360px] w-full object-contain"
                  />
                ) : (
                  <div className="grid min-h-[180px] place-items-center text-center text-sm text-slate-600">
                    <div>
                      <div className="font-medium">
                        {isPdfMimeType(item.attachment_mime_type) ? "PDF 첨부 완료" : "파일 첨부 완료"}
                      </div>
                      <div className="mt-2 break-all text-xs text-slate-500">
                        {item.attachment_name || "첨부 파일"}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="grid min-h-[180px] place-items-center border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                  첨부 파일 없음
                </div>
              )}
            </div>

            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  ["구분", evidenceTypeLabel(item.evidence_type)],
                  ["증빙명", item.title || "-"],
                  ["발급처", item.issuer || "-"],
                  ["증빙일자", item.issued_on || "-"],
                  ["금액", `${formatCurrency(item.amount)}원`],
                  ["연결 항목", item.related_item || "-"],
                  ["첨부 파일", item.attachment_name || "-"],
                  ["파일/보관 메모", item.file_note || "-"],
                  ["비고", item.note || "-"],
                ].map(([label, value]) => (
                  <tr key={`${item.id}-${label}`}>
                    <th className="w-32 border border-slate-200 bg-slate-50 px-3 py-2 text-left">
                      {label}
                    </th>
                    <td className="border border-slate-200 px-3 py-2">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
