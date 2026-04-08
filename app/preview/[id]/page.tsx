import Link from "next/link";
import { notFound } from "next/navigation";
import DriveUploadButton from "@/components/DriveUploadButton";
import EvidenceSheetPrint from "@/components/EvidenceSheetPrint";
import ExpenditurePreview from "@/components/ExpenditurePreview";
import PhotoSheetPrint from "@/components/PhotoSheetPrint";
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
  const evidenceDocumentTitle = `${documentTitle}_증빙서류첨부지`;
  const photoDocumentTitle = `${documentTitle}_증빙사진첨부지`;
  const driveUploadEnabled = hasGoogleDriveUploadEnv();

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          PDF 저장은 결의서 본문 기준이며, 공유드라이브 업로드는 결의서와 첨부지 2종을 함께 올립니다.
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
            <DriveUploadButton
              uploads={[
                { targetId: "expenditure-preview-sheet", documentTitle },
                { targetId: "expenditure-evidence-sheet", documentTitle: evidenceDocumentTitle },
                { targetId: "expenditure-photo-sheet", documentTitle: photoDocumentTitle },
              ]}
            />
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

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: "794px",
          background: "#ffffff",
        }}
      >
        <div id="expenditure-evidence-sheet">
          <EvidenceSheetPrint expenditure={expenditure} sheet={expenditure.evidence_sheet} />
        </div>
        <div id="expenditure-photo-sheet">
          <PhotoSheetPrint expenditure={expenditure} sheet={expenditure.photo_sheet} />
        </div>
      </div>
    </div>
  );
}
