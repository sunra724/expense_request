import { notFound } from "next/navigation";
import DriveUploadButton from "@/components/DriveUploadButton";
import PdfSaveButton from "@/components/PdfSaveButton";
import PrintButton from "@/components/PrintButton";
import ProposalPreview from "@/components/ProposalPreview";
import { getProposal } from "@/lib/db/proposals";
import { getSettings } from "@/lib/db/settings";
import { hasGoogleDriveUploadEnv } from "@/lib/google-drive";

export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = await getProposal(Number(id));
  if (!proposal) notFound();

  const settings = await getSettings();
  const documentTitle = proposal.doc_number || `지출품의서-${proposal.id}`;
  const driveUploadEnabled = hasGoogleDriveUploadEnv();

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          PDF 저장은 문서번호 파일명으로 내려받고, 필요하면 같은 파일을 공유드라이브에도 바로 올릴 수 있습니다.
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <PdfSaveButton targetId="proposal-preview-sheet" documentTitle={documentTitle} />
          {driveUploadEnabled ? (
            <DriveUploadButton targetId="proposal-preview-sheet" documentTitle={documentTitle} />
          ) : null}
          <PrintButton documentTitle={documentTitle} />
        </div>
      </div>
      <div id="proposal-preview-sheet">
        <ProposalPreview proposal={proposal} settings={settings} />
      </div>
    </div>
  );
}
