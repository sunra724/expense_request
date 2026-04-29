import Image from "next/image";
import { getAmountFieldLabels, getAmountPresentationMode } from "@/lib/amount-presentation";
import { countFilledEvidenceItems, countFilledPhotoItems } from "@/lib/attachment-sheets";
import { resolveExpenditureAmount, resolveExpenditureItemAmount } from "@/lib/expenditure-amount";
import { formatCurrency } from "@/lib/format";
import {
  budgetScopeLabel,
  evidenceChecklistLabel,
  evidenceTypeLabel,
  paymentMethodLabel,
} from "@/lib/guideline";
import type { Expenditure, StampSettings } from "@/lib/types";

function ApprovalBox({
  role,
  name,
  stampSrc,
}: {
  role: string;
  name: string;
  stampSrc: string;
}) {
  return (
    <div className="approval-cell">
      <div className="approval-role">{role}</div>
      <div className="approval-body">
        <div className="approval-name">{name}</div>
        <Image src={stampSrc} alt={`${role} 도장`} width={96} height={96} className="approval-stamp" />
      </div>
    </div>
  );
}

export default function ExpenditurePreview({
  expenditure,
  settings,
  linkedProposalDocNumber = "",
}: {
  expenditure: Expenditure;
  settings: StampSettings;
  linkedProposalDocNumber?: string;
}) {
  const pendingChecklist = expenditure.evidence_checklist.filter(
    (key) => !expenditure.evidence_completion[key],
  );
  const organizationName = settings.org_name || "협동조합 소이랩";
  const staffName = settings.staff_name || "이형구";
  const chairpersonName = settings.chairperson_name || "강아름";
  const staffStamp = settings.staff_stamp || "/stamps/lee-hyunggu.png";
  const chairpersonStamp = settings.chairperson_stamp || "/stamps/kang-areum.png";
  const amountMode = getAmountPresentationMode({
    budgetCategory: expenditure.budget_category,
    budgetItem: expenditure.budget_item,
    expenseCategory: expenditure.expense_category,
  });
  const amountLabels = getAmountFieldLabels(amountMode);
  const displayTotalAmount = resolveExpenditureAmount(expenditure);

  return (
    <div className="print-sheet">
      <div className="mb-8 text-center">
        <div className="mb-2 text-3xl font-bold tracking-[0.28em]">지출결의서</div>
        <div className="text-sm text-slate-500">문서번호 {expenditure.doc_number || "-"}</div>
      </div>

      <div className="mb-6 grid grid-cols-[1fr_320px] gap-6">
        <section className="rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="mb-3 font-semibold">기본 정보</div>
          <div className="space-y-2">
            <div>운영기관: {organizationName}</div>
            <div>연결 품의서: {linkedProposalDocNumber || "-"}</div>
            <div>사업명: {expenditure.project_name || "-"}</div>
            <div>발의일: {expenditure.issue_date || "-"}</div>
            <div>회계기록일: {expenditure.record_date || "-"}</div>
            <div>지급방법: {paymentMethodLabel(expenditure.payment_method)}</div>
            <div>증빙유형: {evidenceTypeLabel(expenditure.evidence_type)}</div>
            <div>총금액: {formatCurrency(displayTotalAmount)}원</div>
          </div>
        </section>

        <section className="approval-grid">
          <ApprovalBox role="담당자" name={staffName} stampSrc={staffStamp} />
          <ApprovalBox role="이사장" name={chairpersonName} stampSrc={chairpersonStamp} />
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
          <div>{amountLabels.vendorId}: {expenditure.vendor_business_number || "-"}</div>
          <div>{amountLabels.firstAmount}: {formatCurrency(expenditure.supply_amount)}원</div>
          <div>{amountLabels.secondAmount}: {formatCurrency(expenditure.vat_amount)}원</div>
          <div>{amountLabels.thirdAmount}: {formatCurrency(expenditure.eligible_amount)}원</div>
          {amountMode === "vat" ? (
            <div>{amountLabels.exclusionLabel}: {expenditure.vat_excluded ? "예" : "아니오"}</div>
          ) : (
            <div>입력방식: 원천징수형</div>
          )}
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
                <td className="border border-slate-200 px-3 py-2 text-right">
                  {formatCurrency(resolveExpenditureItemAmount(item, expenditure))}원
                </td>
                <td className="border border-slate-200 px-3 py-2">{item.note}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="border border-slate-200 px-3 py-2 text-right font-semibold">
                합계
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">
                {formatCurrency(displayTotalAmount)}원
              </td>
              <td className="border border-slate-200 px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
        <div>주소: {expenditure.payee_address || "-"}</div>
        <div>영수증명: {expenditure.receipt_name || "-"}</div>
        <div>영수일자: {expenditure.receipt_date || "-"}</div>
        <div>회의/행사 인원: {formatCurrency(expenditure.attendee_count || 0)}명</div>
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
            {pendingChecklist.length
              ? pendingChecklist.map((key) => evidenceChecklistLabel(key)).join(", ")
              : "없음"}
          </div>
        </div>
      </section>

      <div className="print-footer-sign">
        <span>{organizationName}(인)</span>
        <Image
          src="/stamps/soilab-seal.png"
          alt="협동조합 소이랩 직인"
          width={96}
          height={96}
          className="print-org-seal"
        />
      </div>
    </div>
  );
}
