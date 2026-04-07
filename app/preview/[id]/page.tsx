import Link from "next/link";
import { notFound } from "next/navigation";
import DriveUploadButton from "@/components/DriveUploadButton";
import ExpenditurePreview from "@/components/ExpenditurePreview";
import PdfSaveButton from "@/components/PdfSaveButton";
import PrintButton from "@/components/PrintButton";
import { getExpenditure } from "@/lib/db/expenditures";
import { getProposal } from "@/lib/db/proposals";
import { getSettings } from "@/lib/db/settings";
import { hasGoogleDriveUploadEnv } from "@/lib/google-drive";

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
  const documentTitle = expenditure.doc_number || `지출결의서-${expenditure.id}`;
  const driveUploadEnabled = hasGoogleDriveUploadEnv();

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          PDF 저장은 문서번호 파일명으로 내려받고, 필요하면 같은 파일을 공유드라이브에도 바로 올릴 수 있습니다.
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/evidence`}>
            증빙서류 첨부지
          </Link>
          <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/photos`}>
            증빙사진 첨부지
          </Link>
          <PdfSaveButton targetId="expenditure-preview-sheet" documentTitle={documentTitle} />
          {driveUploadEnabled ? (
            <DriveUploadButton targetId="expenditure-preview-sheet" documentTitle={documentTitle} />
          ) : null}
          <PrintButton documentTitle={documentTitle} />
        </div>
      </div>
      <div id="expenditure-preview-sheet">
        <ExpenditurePreview
          expenditure={expenditure}
          settings={settings}
          linkedProposalDocNumber={linkedProposal?.doc_number || ""}
        />
      </div>
    </div>
  );
}
