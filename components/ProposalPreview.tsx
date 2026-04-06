import { budgetScopeLabel, evidenceChecklistLabel, paymentMethodLabel } from "@/lib/guideline";
import { formatCurrency } from "@/lib/format";
import { numberToKorean } from "@/lib/numberToKorean";
import type { Proposal, StampSettings } from "@/lib/types";

const fundLabels = {
  grant: "보조금",
  self: "자부담",
  both: "혼합",
};

export default function ProposalPreview({
  proposal,
  settings,
}: {
  proposal: Proposal;
  settings: StampSettings;
}) {
  return (
    <div className="print-sheet">
      <div className="mb-8 text-center">
        <div className="mb-2 text-3xl font-bold tracking-[0.28em]">지 출 품 의 서</div>
        <div className="text-sm text-slate-500">문서번호 {proposal.doc_number || "-"}</div>
      </div>

      <div className="mb-6 grid grid-cols-[1fr_360px] gap-6">
        <section className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold">기본 정보</div>
          <div className="space-y-2 text-sm">
            <div>기관명: {proposal.org_name || settings.org_name}</div>
            <div>사업명: {proposal.project_name || "-"}</div>
            <div>사업기간: {proposal.project_period || "-"}</div>
            <div>작성일: {proposal.submission_date || "-"}</div>
            <div>재원구분: {fundLabels[proposal.fund_type]}</div>
            <div>예산구분: {budgetScopeLabel(proposal.budget_scope)}</div>
            <div>
              비목/세목: {proposal.budget_category || "-"} / {proposal.budget_item || "-"}
            </div>
            <div>지급방법: {paymentMethodLabel(proposal.payment_method)}</div>
            <div>
              예정금액: {formatCurrency(proposal.total_amount)}원 ({numberToKorean(proposal.total_amount)})
            </div>
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
        <div className="mb-3 text-sm font-semibold">품의 내역</div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {["번호", "비목", "적요", "예정금액", "산출근거", "비고"].map((label) => (
                <th key={label} className="border border-slate-200 px-3 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td className="border border-slate-200 px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-slate-200 px-3 py-2">{item.expense_category}</td>
                <td className="border border-slate-200 px-3 py-2">{item.description}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{formatCurrency(item.estimated_amount)}</td>
                <td className="border border-slate-200 px-3 py-2">{item.calculation_basis}</td>
                <td className="border border-slate-200 px-3 py-2">{item.note}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="border border-slate-200 px-3 py-2 text-right font-semibold">합계</td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">{formatCurrency(proposal.total_amount)}</td>
              <td colSpan={2} className="border border-slate-200 px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 p-4 text-sm">
        <div className="mb-2 font-semibold">집행 기준</div>
        <div className="space-y-2">
          <div>거래처: {proposal.vendor_name || "-"}</div>
          <div>사업자등록번호: {proposal.vendor_business_number || "-"}</div>
          <div>공급가액: {formatCurrency(proposal.supply_amount)}원</div>
          <div>부가세: {formatCurrency(proposal.vat_amount)}원</div>
          <div>집행인정금액: {formatCurrency(proposal.eligible_amount)}원</div>
          <div>재단 승인 필요: {proposal.requires_foundation_approval ? "예" : "아니오"}</div>
          <div>
            증빙 체크리스트:{" "}
            {proposal.evidence_checklist.length
              ? proposal.evidence_checklist.map((key) => evidenceChecklistLabel(key)).join(", ")
              : "-"}
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 p-4 text-sm">
        <div className="mb-2 font-semibold">관련 계획서 및 집행사유</div>
        <div>{proposal.related_plan || "-"}</div>
      </section>

      <div className="mt-20 text-right text-base font-semibold">{proposal.org_name || settings.org_name} (인)</div>
    </div>
  );
}
