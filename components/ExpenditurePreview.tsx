import { countFilledEvidenceItems, countFilledPhotoItems } from "@/lib/attachment-sheets";
import { formatCurrency } from "@/lib/format";
import {
  budgetScopeLabel,
  evidenceChecklistLabel,
  evidenceTypeLabel,
  paymentMethodLabel,
} from "@/lib/guideline";
import type { Expenditure, StampSettings } from "@/lib/types";

export default function ExpenditurePreview({
  expenditure,
  settings,
}: {
  expenditure: Expenditure;
  settings: StampSettings;
}) {
  const pendingChecklist = expenditure.evidence_checklist.filter(
    (key) => !expenditure.evidence_completion[key],
  );

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
            <div>기관명: {settings.org_name || "-"}</div>
            <div>연결 품의서: {expenditure.proposal_id ? `#${expenditure.proposal_id}` : "-"}</div>
            <div>사업명: {expenditure.project_name || "-"}</div>
            <div>발의일: {expenditure.issue_date || "-"}</div>
            <div>회계기록일: {expenditure.record_date || "-"}</div>
            <div>지급방법: {paymentMethodLabel(expenditure.payment_method)}</div>
            <div>증빙유형: {evidenceTypeLabel(expenditure.evidence_type)}</div>
            <div>총 금액: {formatCurrency(expenditure.total_amount)}원</div>
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

      <section className="mb-6 rounded-2xl border border-slate-200 p-4 text-sm">
        <div className="mb-3 font-semibold">예산 및 지급 정보</div>
        <div className="grid gap-2 md:grid-cols-2">
          <div>예산구분: {budgetScopeLabel(expenditure.budget_scope)}</div>
          <div>비목: {expenditure.budget_category || "-"}</div>
          <div>세목: {expenditure.budget_item || "-"}</div>
          <div>거래처: {expenditure.payee_company || "-"}</div>
          <div>수령인: {expenditure.payee_name || "-"}</div>
          <div>사업자등록번호: {expenditure.vendor_business_number || "-"}</div>
          <div>공급가액: {formatCurrency(expenditure.supply_amount)}원</div>
          <div>부가세: {formatCurrency(expenditure.vat_amount)}원</div>
          <div>집행인정금액: {formatCurrency(expenditure.eligible_amount)}원</div>
          <div>부가세 제외 처리: {expenditure.vat_excluded ? "예" : "아니오"}</div>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 text-sm font-semibold">지출 내역</div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {["번호", "적요", "금액", "비고"].map((label) => (
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
              <td colSpan={2} className="border border-slate-200 px-3 py-2 text-right font-semibold">합계</td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">{formatCurrency(expenditure.total_amount)}</td>
              <td className="border border-slate-200 px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
        <div>주소: {expenditure.payee_address || "-"}</div>
        <div>영수증명: {expenditure.receipt_name || "-"}</div>
        <div>영수일자: {expenditure.receipt_date || "-"}</div>
        <div>회의/행사 인원: {expenditure.attendee_count || 0}명</div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 p-4 text-sm">
        <div className="mb-3 font-semibold">첨부 및 정산 상태</div>
        <div className="space-y-2">
          <div>증빙서류 첨부: {countFilledEvidenceItems(expenditure.evidence_sheet)}건</div>
          <div>증빙사진 첨부: {countFilledPhotoItems(expenditure.photo_sheet)}건</div>
          <div>
            체크리스트:{" "}
            {expenditure.evidence_checklist.length
              ? expenditure.evidence_checklist.map((key) => evidenceChecklistLabel(key)).join(", ")
              : "-"}
          </div>
          <div>
            미완료 증빙:{" "}
            {pendingChecklist.length ? pendingChecklist.map((key) => evidenceChecklistLabel(key)).join(", ") : "없음"}
          </div>
        </div>
      </section>
    </div>
  );
}
