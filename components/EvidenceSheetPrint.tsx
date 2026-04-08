import { countFilledEvidenceItems, evidenceTypeLabel } from "@/lib/attachment-sheets";
import { formatCurrency } from "@/lib/format";
import type { EvidenceAttachmentSheet, Expenditure } from "@/lib/types";

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

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            {["연번", "구분", "증빙명", "발급처", "증빙일자", "금액", "연결 항목", "첨부 메모", "비고"].map(
              (label) => (
                <th key={label} className="border border-slate-200 px-2 py-2">
                  {label}
                </th>
              ),
            )}
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
  );
}
