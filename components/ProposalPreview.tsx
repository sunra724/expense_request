import Image from "next/image";
import { budgetScopeLabel, evidenceChecklistLabel, paymentMethodLabel } from "@/lib/guideline";
import { formatCurrency } from "@/lib/format";
import { numberToKorean } from "@/lib/numberToKorean";
import type { Proposal, StampSettings } from "@/lib/types";

const fundLabels = {
  grant: "보조금",
  self: "자부담",
  both: "혼합",
} as const;

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
        <Image
          src={stampSrc}
          alt={`${role} 도장`}
          width={96}
          height={96}
          className="approval-stamp"
        />
      </div>
    </div>
  );
}

export default function ProposalPreview({
  proposal,
  settings,
}: {
  proposal: Proposal;
  settings: StampSettings;
}) {
  const organizationName = settings.org_name || "협동조합 소이랩";
  const staffName = settings.staff_name || "이형구";
  const chairpersonName = settings.chairperson_name || "강아름";
  const staffStamp = settings.staff_stamp || "/stamps/lee-hyunggu.png";
  const chairpersonStamp = settings.chairperson_stamp || "/stamps/kang-areum.png";

  return (
    <div className="print-sheet">
      <div className="mb-8 text-center">
        <div className="mb-2 text-3xl font-bold tracking-[0.28em]">지출품의서</div>
        <div className="text-sm text-slate-500">문서번호 {proposal.doc_number || "-"}</div>
      </div>

      <div className="mb-6 grid grid-cols-[1fr_320px] gap-6">
        <section className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold">기본 정보</div>
          <div className="space-y-2 text-sm">
            <div>지원기관: {proposal.org_name || "-"}</div>
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
              예정금액: {formatCurrency(proposal.total_amount)}원 ({numberToKorean(proposal.total_amount)}원)
            </div>
          </div>
        </section>

        <section className="approval-grid">
          <ApprovalBox role="담당자" name={staffName} stampSrc={staffStamp} />
          <ApprovalBox role="이사장" name={chairpersonName} stampSrc={chairpersonStamp} />
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
                <td className="border border-slate-200 px-3 py-2 text-right">
                  {formatCurrency(item.estimated_amount)}원
                </td>
                <td className="border border-slate-200 px-3 py-2">{item.calculation_basis}</td>
                <td className="border border-slate-200 px-3 py-2">{item.note}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="border border-slate-200 px-3 py-2 text-right font-semibold">
                합계
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">
                {formatCurrency(proposal.total_amount)}원
              </td>
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
        <div className="mb-2 font-semibold">관련 계획 및 집행사유</div>
        <div>{proposal.related_plan || "-"}</div>
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
