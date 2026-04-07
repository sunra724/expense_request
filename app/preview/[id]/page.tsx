import Link from "next/link";
import { notFound } from "next/navigation";
import ExpenditurePreview from "@/components/ExpenditurePreview";
import PrintButton from "@/components/PrintButton";
import { getExpenditure } from "@/lib/db/expenditures";
import { getProposal } from "@/lib/db/proposals";
import { getSettings } from "@/lib/db/settings";

export default async function ExpenditurePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expenditure = await getExpenditure(Number(id));
  if (!expenditure) notFound();

  const linkedProposal = expenditure.proposal_id ? await getProposal(expenditure.proposal_id) : null;
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          버튼을 누른 뒤 브라우저 인쇄 창에서 `PDF로 저장`을 선택하면 문서번호로 저장할 수 있습니다.
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/evidence`}>
            증빙서류 첨부지
          </Link>
          <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/photos`}>
            증빙사진 첨부지
          </Link>
          <PrintButton documentTitle={expenditure.doc_number || `지출결의서-${expenditure.id}`} />
        </div>
      </div>
      <ExpenditurePreview
        expenditure={expenditure}
        settings={settings}
        linkedProposalDocNumber={linkedProposal?.doc_number || ""}
      />
    </div>
  );
}
