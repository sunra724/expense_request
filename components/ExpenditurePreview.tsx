import type { Expenditure, StampSettings } from "@/lib/types";
import { countFilledEvidenceItems, countFilledPhotoItems } from "@/lib/attachment-sheets";
import { formatCurrency } from "@/lib/format";

export default function ExpenditurePreview({
  expenditure,
  settings,
}: {
  expenditure: Expenditure;
  settings: StampSettings;
}) {
  return (
    <div className="print-sheet">
      <div className="mb-8 text-center">
        <div className="mb-2 text-3xl font-bold tracking-[0.28em]">지 출 결 의 서</div>
        <div className="text-sm text-slate-500">문서번호 {expenditure.doc_number || "-"}</div>
      </div>

      <div className="mb-6 grid grid-cols-[1fr_360px] gap-6">
        <section className="rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="mb-3 font-semibold">기본 정보</div>
          <div className="space-y-2">
            <div>연계 품의서: {expenditure.proposal_id ? `#${expenditure.proposal_id}` : "-"}</div>
            <div>단위사업명: {expenditure.project_name || "-"}</div>
            <div>발의일: {expenditure.issue_date || "-"}</div>
            <div>회계기록일: {expenditure.record_date || "-"}</div>
            <div>지급방법: {expenditure.payment_method || "-"}</div>
            <div>총 금액: 금 {formatCurrency(expenditure.total_amount)}원</div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200">
          <div className="grid grid-cols-3 text-center text-xs font-semibold">
            <div className="border-b border-r border-slate-200 p-3">{settings.staff_name}</div>
            <div className="border-b border-r border-slate-200 p-3">{settings.manager_name}</div>
            <div className="border-b border-slate-200 p-3">{settings.chairperson_name}</div>
            <div className="border-r border-slate-200 p-8 text-slate-400">(인)</div>
            <div className="border-r border-slate-200 p-8 text-slate-400">(인)</div>
            <div className="p-8 text-slate-400">(인)</div>
          </div>
        </section>
      </div>

      <section className="mb-6">
        <div className="mb-3 text-sm font-semibold">지출 내역</div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {["연번", "적요", "금액", "비고"].map((label) => (
                <th key={label} className="border border-slate-200 px-3 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenditure.items.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td className="border border-slate-200 px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-slate-200 px-3 py-2">{item.description}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
                <td className="border border-slate-200 px-3 py-2">{item.note}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="border border-slate-200 px-3 py-2 text-right font-semibold">
                합계
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">
                {formatCurrency(expenditure.total_amount)}
              </td>
              <td className="border border-slate-200 px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
        <div>거래처: {expenditure.payee_company || "-"}</div>
        <div>수취인: {expenditure.payee_name || "-"}</div>
        <div>주소: {expenditure.payee_address || "-"}</div>
        <div>영수증: {expenditure.receipt_name || "-"}</div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 p-4 text-sm">
        <div className="mb-3 font-semibold">첨부철 연동 현황</div>
        <div className="space-y-2">
          <div>증빙서류 첨부철: {countFilledEvidenceItems(expenditure.evidence_sheet)}건</div>
          <div>증빙사진 첨부철: {countFilledPhotoItems(expenditure.photo_sheet)}건</div>
          <div className="text-slate-500">
            카드 전표, 세금계산서, 현금영수증, 영수증과 사진대지는 결의서와 연결된 첨부철 화면에서 관리합니다.
          </div>
        </div>
      </section>
    </div>
  );
}
